"""Verify external doc links to docs.everythingsmart.io are still alive.

User-guide pages link out to Everything Smart's hosted docs (CO₂ module install,
hardware overview). If those upstream pages move or are removed, our links break
silently. This test discovers every link to that domain under docs/ and confirms
each one responds successfully.

The live HTTP checks are opt-in: set EXTERNAL_LINK_CHECKS=1 to run them.
By default they skip so CI doesn't depend on docs.everythingsmart.io being
up (a transient upstream 5xx would fail an unrelated build). The offline
link-DISCOVERY and error-propagation unit tests always run. When live checks
run, they still skip (not fail) when the network is unavailable (DNS blocked,
TCP refused, timeout) so offline development isn't blocked.
"""

from __future__ import annotations

import os
import re
import sys
from collections.abc import Iterator
from pathlib import Path
from urllib.error import HTTPError
from urllib.error import URLError
from urllib.request import Request
from urllib.request import urlopen

import pytest
import pytest_socket

REPO_ROOT = Path(__file__).resolve().parents[1]
DOCS_ROOT = REPO_ROOT / "docs"
URL_PATTERN = re.compile(r"https://docs\.everythingsmart\.io/[^\s)\"<>\]]+")
TRAILING_PUNCT = ".,);:'\""
TIMEOUT = 15
USER_AGENT = "epp-grid-link-check/1.0"


def _discover_links(root: Path) -> list[str]:
    """Return sorted unique docs.everythingsmart.io URLs referenced under root."""
    found: set[str] = set()
    for md in root.rglob("*.md"):
        for match in URL_PATTERN.findall(md.read_text(encoding="utf-8")):
            found.add(match.rstrip(TRAILING_PUNCT))
    return sorted(found)


def _check(url: str) -> int:
    """Return HTTP status for url. Raises HTTPError on 4xx/5xx, URLError on connect failure."""
    last_exc: HTTPError | None = None
    for method in ("HEAD", "GET"):
        req = Request(url, method=method, headers={"User-Agent": USER_AGENT})
        try:
            with urlopen(req, timeout=TIMEOUT) as resp:
                return int(resp.status)
        except HTTPError as e:
            # Some servers reject HEAD with 403/405 — retry with GET.
            if method == "HEAD" and e.code in (403, 405):
                last_exc = e
                continue
            raise
    assert last_exc is not None
    raise last_exc


def _is_offline(exc: BaseException) -> bool:
    """Recognize 'no network here' so we skip instead of fail.

    Covers OSError/TimeoutError (DNS failure, TCP refused/unreachable, timeout)
    and RuntimeError("...disabled in tests") from the HA test plugin's DNS
    guard, which replaces the real resolver and propagates as RuntimeError
    rather than being wrapped in URLError.
    """
    if isinstance(exc, URLError):
        exc = exc.reason  # unwrap one level
    if isinstance(exc, OSError | TimeoutError):
        return True
    return isinstance(exc, RuntimeError) and "disabled" in str(exc).lower()


LINKS = _discover_links(DOCS_ROOT)

#: Live checks are opt-in — see module docstring. Evaluated via skipif (not an
#: in-test pytest.skip) so the network_unblocked fixture — which pokes
#: pytest-socket's private _remove_restrictions() — never runs by default.
LIVE_CHECKS_ENABLED = os.environ.get("EXTERNAL_LINK_CHECKS") == "1"


@pytest.fixture
def network_unblocked() -> Iterator[None]:
    """Clear pytest-socket restrictions for the test, then re-establish them on teardown.

    The HA test plugin pins all socket.connect() calls to 127.0.0.1 before each
    test (via `socket_allow_hosts`), and pytest-socket's `enable_socket` marker
    only un-patches socket creation — not the connect-host filter. We use
    pytest_socket._remove_restrictions() to clear both at once. The teardown
    re-applies the same guards so a leaked socket from this test can't reach
    the network in any subsequent test, even if pytest-socket's own
    pytest_runtest_teardown hook order changes in a future release.
    """
    pytest_socket._remove_restrictions()
    try:
        yield
    finally:
        pytest_socket.socket_allow_hosts(["127.0.0.1"], allow_unix_socket=True)
        pytest_socket.disable_socket(allow_unix_socket=True)


def test_discover_links_extracts_unique_sorted_urls(tmp_path: Path) -> None:
    """Discovery finds docs.everythingsmart.io URLs across markdown, deduped, trailing punct stripped."""
    (tmp_path / "a.md").write_text(
        "see [guide](https://docs.everythingsmart.io/page-1).\n"
        "and [other](https://example.com/x).\n",  # different domain — ignored
    )
    sub = tmp_path / "sub"
    sub.mkdir()
    (sub / "b.md").write_text(
        "duplicate https://docs.everythingsmart.io/page-1\n"
        "and https://docs.everythingsmart.io/page-2.\n",  # trailing dot stripped
    )
    assert _discover_links(tmp_path) == [
        "https://docs.everythingsmart.io/page-1",
        "https://docs.everythingsmart.io/page-2",
    ]


def test_check_propagates_404(monkeypatch: pytest.MonkeyPatch) -> None:
    """When urlopen raises HTTPError(404), _check propagates it unchanged.

    Pure unit test (no network) so it's stable across upstream changes and
    runs everywhere. Without this, a regression that silently swallowed HTTP
    errors would let the live-link parametrized test pass even when an
    upstream doc disappears.
    """

    def fake_urlopen(_req: Request, timeout: float = 0) -> object:
        raise HTTPError("https://example.invalid", 404, "Not Found", hdrs=None, fp=None)  # type: ignore[arg-type]

    monkeypatch.setattr(sys.modules[__name__], "urlopen", fake_urlopen)
    with pytest.raises(HTTPError) as excinfo:
        _check("https://docs.everythingsmart.io/anything")
    assert excinfo.value.code == 404


@pytest.mark.skipif(
    not LIVE_CHECKS_ENABLED,
    reason="set EXTERNAL_LINK_CHECKS=1 to run live link checks",
)
@pytest.mark.skipif(not LINKS, reason="No docs.everythingsmart.io links found in docs/")
@pytest.mark.parametrize("url", LINKS)
def test_external_doc_link_is_alive(url: str, network_unblocked: None) -> None:
    try:
        status = _check(url)
    except HTTPError as e:
        pytest.fail(f"{url} → HTTP {e.code} {e.reason}")
    except (URLError, RuntimeError) as e:
        if _is_offline(e):
            pytest.skip(f"Network unavailable: {e}")
        pytest.fail(f"{url} → unreachable: {e}")
    assert 200 <= status < 400, f"{url} → unexpected status {status}"
