# Lovelace Blind Card Enhanced

![HACS](https://img.shields.io/badge/HACS-Default-orange.svg?style=for-the-badge)

A modern, highly visual blind control card for Home Assistant.

![Preview](images/blinds-preview.png)

This is a fork of the original Blind Card by [tungmeister](https://github.com/tungmeister/hass-blind-card), extended with improved visuals, drag control, and additional configuration options.

![Demo](images/blinds-demo.gif)

---

## Features

- Drag-to-set blind position with live percentage preview
- Smooth, physically accurate blind animation
- Optional pull cord interaction
- Multiple visual styles: roller, single door, split window, and sliding windows
- Invert position and/or commands
- Custom blind and pull cord colours
- Button and drag control combined
- Available from the default HACS repository list

---

## Configuration

### General

| Name | Required | Description |
|------|----------|-------------|
| type | Yes | Must be `custom:lovelace-blind-card-enhanced` |
| title | No | Title of the card |

---

### Entities

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| entity | Yes | - | Cover entity ID |
| name | No | Friendly name | Display name |
| buttons_position | No | `left` | `left` or `right` |
| title_position | No | `top` | `top` or `bottom` |
| invert_percentage | No | `false` | Invert percentage logic |
| invert_commands | No | `false` | Flip up/down button commands |
| blind_color | No | `#4a4a4a` | Blind colour |
| pull_color | No | `#d8d8d8` | Pull cord colour |
| style | No | `roller` | Visual style |
| show_pull | No | `true` | Show pull cord |

---

## Styles

Supported style values:

- `roller`
- `single_door`
- `split_window`
- `sliding_left`
- `sliding_right`

Use the `style` option per entity to change the visual representation.

---

## Example

```yaml
type: custom:lovelace-blind-card-enhanced
title: Blinds
entities:
  - entity: cover.study_blind
    name: Study
    style: single_door
    blind_color: "#3f3f3f"
    pull_color: "#d8d8d8"

  - entity: cover.lounge_left_blind
    name: Lounge Left
    style: sliding_left

  - entity: cover.lounge_right_blind
    name: Lounge Right
    style: sliding_right
