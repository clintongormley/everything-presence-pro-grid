import { describe, expect, it } from "vitest";
import cs from "../../translations/cs.json";
import en from "../../translations/en.json";
import es from "../../translations/es.json";
import { integrationPageLink } from "../integration-page.js";

describe("integrationPageLink", () => {
	it("uses the Marketplace when Home Assistant has it", () => {
		expect(integrationPageLink(["http", "marketplace"])).toEqual({
			href: "/marketplace/repository/1172848595",
			isMarketplace: true,
		});
	});

	it("keeps the HACS page otherwise", () => {
		const hacs = {
			href: "/hacs/repository/1172848595",
			isMarketplace: false,
		};
		expect(integrationPageLink(["http"])).toEqual(hacs);
		expect(integrationPageLink(undefined)).toEqual(hacs);
	});
});

describe("integration update wording", () => {
	it.each([
		["en", en, "Settings → Updates", "Open in Marketplace"],
		["es", es, "Ajustes → Actualizaciones", "Abrir en Marketplace"],
		["cs", cs, "Nastavení → Aktualizace", "Otevřít v Marketplace"],
	])("%s points to the updates page, not HACS", (_lang, t, path, open) => {
		expect(t.protocol.firmware_ahead).toContain(path);
		expect(t.protocol.firmware_ahead).not.toContain("HACS");
		expect(t.protocol.open_marketplace).toBe(open);
		expect(t.flasher.open_marketplace).toBe(open);
	});
});
