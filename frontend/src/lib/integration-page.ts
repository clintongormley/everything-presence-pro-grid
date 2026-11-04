const REPOSITORY_ID = "1172848595";

export interface IntegrationPageLink {
	href: string;
	isMarketplace: boolean;
}

/** Where to update the integration, given `hass.config.components`. */
export function integrationPageLink(
	components: readonly string[] | undefined,
): IntegrationPageLink {
	return components?.includes("marketplace")
		? {
				href: `/marketplace/repository/${REPOSITORY_ID}`,
				isMarketplace: true,
			}
		: { href: `/hacs/repository/${REPOSITORY_ID}`, isMarketplace: false };
}
