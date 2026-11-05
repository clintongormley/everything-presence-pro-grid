// The shipped code under test: `renderSelect` itself, and every component that
// calls it. Nothing here may hold its own copy of the select logic, or the run
// stays green when `src/ui/select.ts` breaks.
import { html, render } from "lit";
import { renderSelect } from "../../src/ui/select";
import "../../src/components/epp-settings-view";
import "../../src/components/epp-flasher-view";
import "../../src/components/epp-device-source-list";
import "../../src/eppgrid-panel";

(window as any).EPP = { html, render, renderSelect };
