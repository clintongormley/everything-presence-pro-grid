# Furniture

Furniture is a purely visual layer. You place icons for sofas, beds, tables, and appliances on the grid so the live overview is easy to read. Furniture **does not affect detection** in any way; it's decoration.

Adding furniture turns the live overview into something that looks like your actual room. Real-time targets make intuitive sense ("that's someone walking past the dining table"), ghost detections become explainable ("that's always the ceiling fan over the reading chair"), and when you come back to tune zones six months from now, you still know what each cell represents.

!!! note
    Only the **Detection zones** editor (room boundary and named zones) and the **Overlays** editor (Entry/Exit, Interference, Suppress) change how the zone engine behaves. Anything you do in the Furniture editor is cosmetic.

## Adding furniture

1. Switch to the **Furniture** editor mode in the sidebar.
2. The sidebar lists the preset stickers — beds, sofas, tables, kitchen and bathroom items, doors, plants, and so on. Use the search box at the top to filter by name.
3. Click a sticker. The item lands centred in the room at its default real-world dimensions (in millimetres).
4. Drag the item to position it on the grid.

![Searching for a furniture icon with 'table' in the name.](../images/furniture/adding.png "Searching for a furniture icon with 'table' in the name.")

## Moving, resizing, rotating

Click a furniture item on the grid to select it. Handles appear for every operation:

- **Move:** click and drag anywhere inside the item.
- **Resize:** drag one of the eight resize handles (four corners, four edges). The defaults match typical real-world dimensions; resize to match the actual furniture in your room.
- **Rotate:** drag the circular handle on the rotation stem that extends above the item.
- **Delete:** click the red **×** button at the top right of the selected item.

Touch works too: select, move, resize, and rotate by dragging with a finger. The editor is usable on a tablet.

!!! tip
    Place the door stickers (`door-left-swing`, `door-right-swing`, `sliding-door`) exactly where you've drawn Entry/Exit [overlays](overlays.md). The doorway icons make it easy to see why the hatched overlay cells are there.

!!! example "Screenshot placeholder"
    **Grid with a dressed room — bed, dining table and chairs, sofa, doors marked at entry points.** `furniture/dressed-room.png`

## Keyboard shortcuts

When a furniture item is selected, the following keyboard shortcuts are enabled:

| Key | Action |
| --- | --- |
| **Delete** / **Backspace** | Delete the selected item |
| **Escape** | Deselect |
| **Ctrl/Cmd + C** | Copy |
| **Ctrl/Cmd + X** | Cut |
| **Ctrl/Cmd + V** | Paste. The new item lands one cell offset from the original so you can see it |

## Custom icons

If none of the presets match what you want to represent, pick the **+** custom-icon slot at the end of the sticker list. It opens Home Assistant's built-in icon picker, which lets you choose any icon from the standard Material Design Icons set (`mdi:*`) bundled with HA. Once added, a custom icon behaves like any other piece of furniture.

## Troubleshooting

Still stuck? See [Troubleshooting](troubleshooting.md) for how to open an issue.

## Where to next

- **[Backup and restore →](backup-restore.md)** — save the device configuration so you can roll back after recalibration or experiments.
- **[Settings →](settings/index.md)** — tune detection, reporting, environmental offsets, LED and relay behaviour.
- **[Automations →](automations.md)** — put it all to use with worked examples.
