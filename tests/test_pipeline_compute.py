"""Tests for pipeline interval computation."""

from __future__ import annotations


class TestComputePipeline:
    """Tests for _compute_pipeline function."""

    def test_all_disabled_no_subscribers(self) -> None:
        """All intervals zero when nothing enabled and no subscribers."""
        from custom_components.eppgrid.device_manager._helpers import _compute_pipeline

        result = _compute_pipeline(config={}, raw_target_subs=0, grid_target_subs=0)
        assert result == {
            "entity_target_interval": 0,
            "entity_zone_interval": 0,
            "display_interval": 0,
            "zone_state_interval": 0,
            "heatmap_interval": 0,
        }

    def test_target_entities_enabled_uses_configured_rate(self) -> None:
        from custom_components.eppgrid.device_manager._helpers import _compute_pipeline

        result = _compute_pipeline(
            config={"settings": {"target_xy": True, "target_update_rate_ms": 500}},
            raw_target_subs=0,
            grid_target_subs=0,
        )
        assert result["entity_target_interval"] == 500

    def test_target_entities_all_disabled_gives_zero(self) -> None:
        from custom_components.eppgrid.device_manager._helpers import _compute_pipeline

        result = _compute_pipeline(
            config={
                "settings": {
                    "target_xy": False,
                    "target_active": False,
                    "target_signal": False,
                    "target_zone": False,
                    "target_update_rate_ms": 500,
                }
            },
            raw_target_subs=0,
            grid_target_subs=0,
        )
        assert result["entity_target_interval"] == 0

    def test_zone_entities_enabled_uses_configured_rate(self) -> None:
        from custom_components.eppgrid.device_manager._helpers import _compute_pipeline

        result = _compute_pipeline(
            config={"settings": {"zone_presence": True, "zone_update_rate_ms": 2000}},
            raw_target_subs=0,
            grid_target_subs=0,
        )
        assert result["entity_zone_interval"] == 2000

    def test_zone_entities_all_disabled_gives_zero(self) -> None:
        from custom_components.eppgrid.device_manager._helpers import _compute_pipeline

        result = _compute_pipeline(
            config={
                "settings": {
                    "zone_presence": False,
                    "zone_target_count": False,
                    "zone_update_rate_ms": 1000,
                }
            },
            raw_target_subs=0,
            grid_target_subs=0,
        )
        assert result["entity_zone_interval"] == 0

    def test_raw_subscribers_enable_display(self) -> None:
        from custom_components.eppgrid.device_manager._helpers import _compute_pipeline

        result = _compute_pipeline(config={}, raw_target_subs=1, grid_target_subs=0)
        assert result["display_interval"] == 200

    def test_grid_subscribers_enable_display_and_zone_state(self) -> None:
        from custom_components.eppgrid.device_manager._helpers import _compute_pipeline

        result = _compute_pipeline(config={}, raw_target_subs=0, grid_target_subs=1)
        assert result["display_interval"] == 200
        assert result["zone_state_interval"] == 1000

    def test_no_subscribers_disables_display_and_zone_state(self) -> None:
        from custom_components.eppgrid.device_manager._helpers import _compute_pipeline

        result = _compute_pipeline(config={}, raw_target_subs=0, grid_target_subs=0)
        assert result["display_interval"] == 0
        assert result["zone_state_interval"] == 0

    def test_pipeline_result_has_no_window_duration_field(self) -> None:
        """The rolling window is fixed (1000ms) on the firmware side; the
        pipeline result no longer carries a window_duration knob."""
        from custom_components.eppgrid.device_manager._helpers import _compute_pipeline

        result = _compute_pipeline(config={}, raw_target_subs=0, grid_target_subs=0)
        assert "window_duration" not in result

    def test_default_rates_when_not_configured(self) -> None:
        from custom_components.eppgrid.device_manager._helpers import _compute_pipeline

        result = _compute_pipeline(
            config={"settings": {"target_xy": True, "zone_presence": True}},
            raw_target_subs=0,
            grid_target_subs=0,
        )
        assert result["entity_target_interval"] == 1000
        assert result["entity_zone_interval"] == 1000

    def test_single_target_entity_enables_target_interval(self) -> None:
        from custom_components.eppgrid.device_manager._helpers import _compute_pipeline

        result = _compute_pipeline(
            config={"settings": {"target_signal": True}},
            raw_target_subs=0,
            grid_target_subs=0,
        )
        assert result["entity_target_interval"] == 1000

    def test_heatmap_subscribers_enable_heatmap_interval(self) -> None:
        from custom_components.eppgrid.device_manager._helpers import _compute_pipeline

        off = _compute_pipeline(config={}, raw_target_subs=0, grid_target_subs=0, heatmap_subs=0)
        assert off["heatmap_interval"] == 0

        on = _compute_pipeline(config={}, raw_target_subs=0, grid_target_subs=0, heatmap_subs=1)
        assert on["heatmap_interval"] == 2000
        # heatmap alone must not turn on the display/zone-state streams
        assert on["display_interval"] == 0
        assert on["zone_state_interval"] == 0


def test_supports_heatmap_version_gate() -> None:
    from custom_components.eppgrid.device_manager._helpers import supports_heatmap

    assert supports_heatmap("1.3.0") is True
    assert supports_heatmap("1.4.0") is True
    assert supports_heatmap("1.2.1") is False
    assert supports_heatmap("") is False
    assert supports_heatmap(None) is False  # type: ignore[arg-type]
