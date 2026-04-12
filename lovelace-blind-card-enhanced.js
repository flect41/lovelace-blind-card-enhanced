class LovelaceBlindCardEnhanced extends HTMLElement {
  normalizeStyle(style) {
    const s = (style || "roller").toLowerCase();

    if (s === "door" || s === "single_door") return "single_door";
    if (s === "split_window" || s === "awning_window") return "split_window";
    if (s === "sliding_left") return "sliding_left";
    if (s === "sliding_right") return "sliding_right";

    return "roller";
  }

  getRoomVisualHtml(style) {
    switch (style) {
      case "single_door":
        return `
          <div class="sc-room-visual sc-room-single_door">
            <div class="sc-door-panel"></div>
            <div class="sc-door-handle"></div>
          </div>
        `;

      case "split_window":
        return `
          <div class="sc-room-visual sc-room-split_window">
            <div class="sc-split-top-panel"></div>
            <div class="sc-split-bottom-panel"></div>
            <div class="sc-split-divider"></div>
            <div class="sc-split-handle"></div>
          </div>
        `;

      case "sliding_left":
        return `
          <div class="sc-room-visual sc-room-sliding_left">
            <div class="sc-slider-panel sc-slider-panel-left"></div>
            <div class="sc-slider-panel sc-slider-panel-right"></div>
            <div class="sc-slider-divider"></div>
            <div class="sc-slider-handle sc-slider-handle-right"></div>
          </div>
        `;

      case "sliding_right":
        return `
          <div class="sc-room-visual sc-room-sliding_right">
            <div class="sc-slider-panel sc-slider-panel-left"></div>
            <div class="sc-slider-panel sc-slider-panel-right"></div>
            <div class="sc-slider-divider"></div>
            <div class="sc-slider-handle sc-slider-handle-left"></div>
          </div>
        `;

      default:
        return `<div class="sc-room-visual sc-room-roller"></div>`;
    }
  }

  getPointerPageY(event) {
    if (event.pageY !== undefined) return event.pageY;
    if (event.touches && event.touches[0]) return event.touches[0].pageY;
    if (event.changedTouches && event.changedTouches[0]) return event.changedTouches[0].pageY;
    return 0;
  }

  getPictureTop(picture) {
    const pictureBox = picture.getBoundingClientRect();
    const body = document.body;
    const docEl = document.documentElement;
    const scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
    const clientTop = docEl.clientTop || body.clientTop || 0;
    return pictureBox.top + scrollTop - clientTop;
  }

  getTrackMetrics(picture) {
    const cs = getComputedStyle(picture);
    const trackTop = parseFloat(cs.getPropertyValue("--track-top")) || 20;
    const trackLeft = parseFloat(cs.getPropertyValue("--track-left")) || 10;
    const trackRight = parseFloat(cs.getPropertyValue("--track-right")) || 10;
    const trackBottom = parseFloat(cs.getPropertyValue("--track-bottom")) || 4;
    const pickerHeight = parseFloat(cs.getPropertyValue("--picker-height")) || 8;
    const stemLength = parseFloat(cs.getPropertyValue("--pull-stem-length")) || 12;
    const dotSize = parseFloat(cs.getPropertyValue("--pull-dot-size")) || 12;
    const pictureHeight = picture.clientHeight;

    return {
      min: trackTop,
      max: pictureHeight - trackBottom - pickerHeight,
      left: trackLeft,
      right: trackRight,
      pickerHeight,
      stemLength,
      dotSize,
      dotRadius: dotSize / 2,
    };
  }

  projectedPositionFromTrack(position, invertPercentage, picture) {
    const metrics = this.getTrackMetrics(picture);
    const clamped = Math.max(metrics.min, Math.min(metrics.max, position));
    const percentagePosition = ((clamped - metrics.min) * 100) / (metrics.max - metrics.min);
    return invertPercentage ? Math.round(percentagePosition) : Math.round(100 - percentagePosition);
  }

  updateBlindPosition(hass, entityId, position) {
    hass.callService("cover", "set_cover_position", {
      entity_id: entityId,
      position: Math.round(position),
    });
  }

  setPickerPosition(position, picker, slide, picture, pull, pullStem, dragIndicator) {
    const metrics = this.getTrackMetrics(picture);

    let pos = position;
    if (pos < metrics.min) pos = metrics.min;
    if (pos > metrics.max) pos = metrics.max;

    picker.style.top = pos + "px";

    const slideHeight = pos - metrics.min;
    slide.style.height = slideHeight + "px";

    if (pull && pullStem) {
      const centerX = picture.clientWidth / 2;

      const sheetBottom = pos;
      let stemTop = sheetBottom;
      let dotTop = stemTop + metrics.stemLength;

      const maxDotTop = picture.clientHeight + 14 - metrics.dotSize;
      if (dotTop > maxDotTop) {
        dotTop = maxDotTop;
        stemTop = dotTop - metrics.stemLength;
      }

      pullStem.style.left = centerX + "px";
      pullStem.style.top = stemTop + "px";
      pullStem.style.height = Math.max(4, dotTop - stemTop) + "px";

      pull.style.left = centerX + "px";
      pull.style.top = dotTop + "px";
    }

    if (dragIndicator) {
      dragIndicator.style.left = Math.round(picture.clientWidth / 2) + "px";
      dragIndicator.style.top = Math.max(2, pos - 30) + "px";
    }
  }

  setPickerPositionPercentage(position, picker, slide, picture, pull, pullStem, dragIndicator) {
    const metrics = this.getTrackMetrics(picture);
    const realPosition = ((metrics.max - metrics.min) * position) / 100 + metrics.min;
    this.setPickerPosition(realPosition, picker, slide, picture, pull, pullStem, dragIndicator);
  }

  set hass(hass) {
    const _this = this;
    const entities = this.config.entities;

    if (!this.card) {
      const card = document.createElement("ha-card");

      if (this.config.title) {
        card.header = this.config.title;
      }

      this.card = card;
      this.appendChild(card);

      const allBlinds = document.createElement("div");
      allBlinds.className = "sc-blinds";

      entities.forEach(function (entity) {
        const entityId = typeof entity === "string" ? entity : entity.entity;

        let buttonsPosition = "left";
        if (entity && entity.buttons_position) {
          buttonsPosition = entity.buttons_position.toLowerCase();
        }

        let titlePosition = "top";
        if (entity && entity.title_position) {
          titlePosition = entity.title_position.toLowerCase();
        }

        let invertPercentage = false;
        if (entity && entity.invert_percentage) {
          invertPercentage = entity.invert_percentage;
        }

        let invertCommands = false;
        if (entity && entity.invert_commands) {
          invertCommands = entity.invert_commands;
        }

        let blindColor = "#4a4a4a";
        if (entity && entity.blind_color) {
          blindColor = entity.blind_color;
        }

        const blindStyle = _this.normalizeStyle(entity && entity.style ? entity.style : "roller");

        let showPull = blindStyle !== "single_door";
        if (entity && entity.show_pull !== undefined) {
          showPull = entity.show_pull;
        }

        let pullColor = "#d8d8d8";
        if (entity && entity.pull_color) {
          pullColor = entity.pull_color;
        }

        const blind = document.createElement("div");
        blind.className = "sc-blind";
        blind.dataset.blind = entityId;

        blind.innerHTML = `
          <div class="sc-blind-top" ${titlePosition === "bottom" ? 'style="display:none;"' : ""}>
            <div class="sc-blind-label"></div>
            <div class="sc-blind-position"></div>
          </div>

          <div class="sc-blind-middle" style="flex-direction:${buttonsPosition === "right" ? "row-reverse" : "row"};">
            <div class="sc-blind-buttons">
              <ha-icon-button class="sc-blind-button" data-command="up"><ha-icon icon="mdi:arrow-up"></ha-icon></ha-icon-button><br>
              <ha-icon-button class="sc-blind-button" data-command="stop"><ha-icon icon="mdi:stop"></ha-icon></ha-icon-button><br>
              <ha-icon-button class="sc-blind-button" data-command="down"><ha-icon icon="mdi:arrow-down"></ha-icon></ha-icon-button>
            </div>

            <div class="sc-blind-selector">
              <div class="sc-blind-selector-picture sc-style-${blindStyle}">
                ${_this.getRoomVisualHtml(blindStyle)}

                <div class="sc-blind-sheet-wrap">
                  <div class="sc-blind-roller"></div>
                  <div class="sc-blind-selector-slide"></div>
                  <div class="sc-blind-selector-picker"></div>
                  ${
                    showPull
                      ? '<div class="sc-blind-pull-stem"></div><div class="sc-blind-pull"></div>'
                      : ""
                  }
                  <div class="sc-drag-indicator"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="sc-blind-bottom" ${titlePosition !== "bottom" ? 'style="display:none;"' : ""}>
            <div class="sc-blind-label"></div>
            <div class="sc-blind-position"></div>
          </div>
        `;

        const picture = blind.querySelector(".sc-blind-selector-picture");
        const slide = blind.querySelector(".sc-blind-selector-slide");
        const picker = blind.querySelector(".sc-blind-selector-picker");
        const pull = blind.querySelector(".sc-blind-pull");
        const pullStem = blind.querySelector(".sc-blind-pull-stem");
        const roller = blind.querySelector(".sc-blind-roller");
        const dragIndicator = blind.querySelector(".sc-drag-indicator");

        slide.style.background = blindColor;
        if (roller) roller.style.background = "rgba(214,214,214,0.98)";
        if (pull) pull.style.background = pullColor;
        if (pullStem) pullStem.style.background = pullColor;

        const applyTrackLayout = function () {
          const metrics = _this.getTrackMetrics(picture);

          const sheetOverlap = 1;
          slide.style.left = (metrics.left + sheetOverlap) + "px";
          slide.style.width = `calc(100% - ${metrics.left + metrics.right + (sheetOverlap * 2)}px)`;
          slide.style.top = metrics.min + "px";

          picker.style.left = (metrics.left + sheetOverlap) + "px";
          picker.style.width = `calc(100% - ${metrics.left + metrics.right + (sheetOverlap * 2)}px)`;
          picker.style.height = metrics.pickerHeight + "px";
        };

        applyTrackLayout();

        let dragOffsetY = 0;

        const showIndicator = function (text) {
          if (!dragIndicator) return;
          dragIndicator.textContent = text;
          dragIndicator.classList.add("show");
        };

        const hideIndicator = function () {
          if (!dragIndicator) return;
          dragIndicator.classList.remove("show");
        };

        const updatePreviewPosition = function (rawPosition) {
          const metrics = _this.getTrackMetrics(picture);

          let pos = rawPosition;
          if (pos < metrics.min) pos = metrics.min;
          if (pos > metrics.max) pos = metrics.max;

          const projected = _this.projectedPositionFromTrack(pos, invertPercentage, picture);

          showIndicator(projected + "%");
          _this.setPickerPosition(pos, picker, slide, picture, pull, pullStem, dragIndicator);
        };

        const mouseDown = function (event) {
          if (event.cancelable) event.preventDefault();
          _this.isUpdating = true;

          const pageY = _this.getPointerPageY(event);

          if (pull) {
            const pictureTop = _this.getPictureTop(picture);
            const pullTop = parseFloat(pull.style.top || "0");
            const metrics = _this.getTrackMetrics(picture);
            const pullCenterY = pictureTop + pullTop + metrics.dotRadius;
            dragOffsetY = pageY - pullCenterY;
          } else {
            dragOffsetY = 0;
          }

          document.addEventListener("mousemove", mouseMove);
          document.addEventListener("touchmove", mouseMove, { passive: false });
          document.addEventListener("pointermove", mouseMove);

          document.addEventListener("mouseup", mouseUp);
          document.addEventListener("touchend", mouseUp);
          document.addEventListener("pointerup", mouseUp);
        };

        const mouseMove = function (event) {
          const pageY = _this.getPointerPageY(event);
          const pictureTop = _this.getPictureTop(picture);
          const metrics = _this.getTrackMetrics(picture);

          let newPosition;
          if (pull) {
            const desiredDotCenterY = pageY - pictureTop - dragOffsetY;
            newPosition = desiredDotCenterY - metrics.stemLength - metrics.dotRadius;
          } else {
            newPosition = pageY - pictureTop;
          }

          updatePreviewPosition(newPosition);
        };

        const mouseUp = function (event) {
          const pageY = _this.getPointerPageY(event);
          const pictureTop = _this.getPictureTop(picture);
          const metrics = _this.getTrackMetrics(picture);

          let newPosition;
          if (pull) {
            const desiredDotCenterY = pageY - pictureTop - dragOffsetY;
            newPosition = desiredDotCenterY - metrics.stemLength - metrics.dotRadius;
          } else {
            newPosition = pageY - pictureTop;
          }

          if (newPosition < metrics.min) newPosition = metrics.min;
          if (newPosition > metrics.max) newPosition = metrics.max;

          const finalPosition = _this.projectedPositionFromTrack(newPosition, invertPercentage, picture);

          _this.isUpdating = false;
          hideIndicator();
          _this.updateBlindPosition(hass, entityId, finalPosition);

          document.removeEventListener("mousemove", mouseMove);
          document.removeEventListener("touchmove", mouseMove);
          document.removeEventListener("pointermove", mouseMove);

          document.removeEventListener("mouseup", mouseUp);
          document.removeEventListener("touchend", mouseUp);
          document.removeEventListener("pointerup", mouseUp);
        };

        if (pull) {
          pull.addEventListener("mousedown", mouseDown);
          pull.addEventListener("touchstart", mouseDown, { passive: false });
          pull.addEventListener("pointerdown", mouseDown);
        } else {
          picker.addEventListener("mousedown", mouseDown);
          picker.addEventListener("touchstart", mouseDown, { passive: false });
          picker.addEventListener("pointerdown", mouseDown);
        }

        blind.querySelectorAll(".sc-blind-button").forEach(function (button) {
          button.onclick = function () {
            const command = this.dataset.command;
            let service = "";

            switch (command) {
              case "up":
                service = !invertCommands ? "open_cover" : "close_cover";
                break;
              case "down":
                service = !invertCommands ? "close_cover" : "open_cover";
                break;
              case "stop":
                service = "stop_cover";
                break;
            }

            hass.callService("cover", service, {
              entity_id: entityId,
            });
          };
        });

        allBlinds.appendChild(blind);
      });

      const style = document.createElement("style");
      style.textContent = `
        .sc-blinds { padding: 16px; }
        .sc-blind { margin-top: 1rem; overflow: visible; }
        .sc-blind:first-child { margin-top: 0; }

        .sc-blind-middle {
          display: flex;
          width: 100%;
          margin: auto;
          align-items: center;
          gap: 14px;
        }

        .sc-blind-buttons {
          flex: 0;
          text-align: center;
          margin-top: 0.2rem;
        }

        .sc-blind-selector {
          flex: 1;
        }

        .sc-blind-selector-picture {
          --track-top: 20px;
          --track-left: 10px;
          --track-right: 10px;
          --track-bottom: 4px;
          --picker-height: 8px;
          --pull-stem-length: 12px;
          --pull-dot-size: 12px;
          position: relative;
          margin: auto;
          background: transparent;
          box-sizing: border-box;
          overflow: visible;
        }

        .sc-room-visual {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
        }

        .sc-blind-sheet-wrap {
          position: absolute;
          inset: 0;
          z-index: 3;
          pointer-events: none;
        }

        .sc-blind-roller {
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          height: 12px;
          border-radius: 7px;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.10);
          z-index: 4;
        }

        .sc-blind-selector-slide {
          position: absolute;
          z-index: 4;
          height: 0;
          opacity: 0.98;
          transition: none;
          box-shadow:
            inset 0 -8px 14px rgba(0,0,0,0.18),
            0 0 0 1px rgba(255,255,255,0.08);
        }

        .sc-blind-selector-picker {
          position: absolute;
          z-index: 5;
          cursor: ns-resize;
          background: transparent;
          pointer-events: none;
        }

        .sc-blind-pull-stem {
          position: absolute;
          left: 50%;
          width: 2px;
          transform: translateX(-50%);
          z-index: 6;
          pointer-events: none;
          opacity: 1;
        }

        .sc-blind-pull {
          position: absolute;
          left: 50%;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          transform: translateX(-50%);
          z-index: 20;
          box-shadow: 0 0 0 2px rgba(0,0,0,0.22);
          cursor: ns-resize;
          pointer-events: auto;
        }

        .sc-drag-indicator {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          min-width: 42px;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 12px;
          line-height: 16px;
          text-align: center;
          background: rgba(30,30,30,0.9);
          color: #fff;
          z-index: 30;
          opacity: 0;
          pointer-events: none;
          transition: opacity 120ms ease;
        }

        .sc-drag-indicator.show {
          opacity: 1;
        }

        .sc-style-single_door,
        .sc-style-split_window,
        .sc-style-roller {
          width: 116px;
          height: 188px;
        }

        .sc-style-sliding_left,
        .sc-style-sliding_right {
          width: 208px;
          height: 188px;
        }

        .sc-style-roller .sc-blind-roller,
        .sc-style-split_window .sc-blind-roller,
        .sc-style-sliding_left .sc-blind-roller,
        .sc-style-sliding_right .sc-blind-roller {
          width: calc(100% - 10px);
        }

        .sc-style-single_door .sc-blind-roller {
          width: calc(100% - 12px);
        }

        .sc-style-single_door .sc-blind-selector-slide {
          border-radius: 0;
        }

        .sc-style-roller .sc-blind-selector-slide,
        .sc-style-split_window .sc-blind-selector-slide,
        .sc-style-sliding_left .sc-blind-selector-slide,
        .sc-style-sliding_right .sc-blind-selector-slide,
        .sc-style-single_door .sc-blind-selector-slide {
          border-top-left-radius: 0;
          border-top-right-radius: 0;
          border-bottom-left-radius: 2px;
          border-bottom-right-radius: 2px;
        }

        .sc-room-single_door .sc-door-panel {
          position: absolute;
          top: 20px;
          bottom: 10px;
          left: 10px;
          right: 10px;
          border: 3px solid rgba(255,255,255,0.82);
          background: transparent;
        }

        .sc-room-single_door .sc-door-handle {
          position: absolute;
          right: 10px;
          top: 50%;
          width: 16px;
          height: 6px;
          margin-top: -3px;
          background: rgba(255,255,255,0.92);
          border-radius: 2px;
          z-index: 2;
        }

        .sc-room-split_window .sc-split-top-panel,
        .sc-room-split_window .sc-split-bottom-panel {
          position: absolute;
          left: 10px;
          right: 10px;
          border: 3px solid rgba(255,255,255,0.78);
          background: transparent;
        }

        .sc-room-split_window .sc-split-top-panel {
          top: 20px;
          height: 44%;
        }

        .sc-room-split_window .sc-split-bottom-panel {
          bottom: 10px;
          height: 38%;
        }

        .sc-room-split_window .sc-split-divider {
          position: absolute;
          left: 10px;
          right: 10px;
          top: 56%;
          height: 3px;
          margin-top: -1.5px;
          background: rgba(255,255,255,0.82);
        }

        .sc-room-split_window .sc-split-handle {
          position: absolute;
          left: 50%;
          top: 48%;
          width: 14px;
          height: 5px;
          margin-left: -7px;
          background: rgba(255,255,255,0.92);
          border-radius: 2px;
          z-index: 2;
        }

        .sc-room-sliding_left .sc-slider-panel,
        .sc-room-sliding_right .sc-slider-panel {
          position: absolute;
          top: 20px;
          bottom: 10px;
          width: calc(50% - 16px);
          border: 3px solid rgba(255,255,255,0.78);
          background: transparent;
        }

        .sc-room-sliding_left .sc-slider-panel-left,
        .sc-room-sliding_right .sc-slider-panel-left {
          left: 10px;
        }

        .sc-room-sliding_left .sc-slider-panel-right,
        .sc-room-sliding_right .sc-slider-panel-right {
          right: 10px;
        }

        .sc-room-sliding_left .sc-slider-divider,
        .sc-room-sliding_right .sc-slider-divider {
          position: absolute;
          top: 20px;
          bottom: 10px;
          left: 50%;
          width: 3px;
          margin-left: -1.5px;
          background: rgba(255,255,255,0.82);
        }

        .sc-room-sliding_left .sc-slider-handle,
        .sc-room-sliding_right .sc-slider-handle {
          position: absolute;
          top: 50%;
          width: 5px;
          height: 16px;
          margin-top: -8px;
          border: 2px solid rgba(255,255,255,0.92);
          background: transparent;
          border-radius: 1px;
          z-index: 2;
        }

        .sc-room-sliding_left .sc-slider-handle-right {
          right: 10px;
        }

        .sc-room-sliding_right .sc-slider-handle-left {
          left: 10px;
        }

        .sc-blind-top {
          text-align: center;
          margin-bottom: 1rem;
        }

        .sc-blind-bottom {
          text-align: center;
          margin-top: 1rem;
        }

        .sc-blind-label {
          display: inline-block;
          font-size: 20px;
          vertical-align: middle;
        }

        .sc-blind-position {
          display: inline-block;
          vertical-align: middle;
          padding: 0 6px;
          margin-left: 1rem;
          border-radius: 2px;
          background-color: var(--secondary-background-color);
        }
      `;

      this.card.appendChild(allBlinds);
      this.appendChild(style);
    }

    entities.forEach((entity) => {
      const entityId = typeof entity === "string" ? entity : entity.entity;

      let invertPercentage = false;
      if (entity && entity.invert_percentage) {
        invertPercentage = entity.invert_percentage;
      }

      const blind = _this.card.querySelector('div[data-blind="' + entityId + '"]');
      const slide = blind.querySelector(".sc-blind-selector-slide");
      const picker = blind.querySelector(".sc-blind-selector-picker");
      const picture = blind.querySelector(".sc-blind-selector-picture");
      const pull = blind.querySelector(".sc-blind-pull");
      const pullStem = blind.querySelector(".sc-blind-pull-stem");
      const roller = blind.querySelector(".sc-blind-roller");
      const dragIndicator = blind.querySelector(".sc-drag-indicator");

      const state = hass.states[entityId];
      const friendlyName =
        entity && entity.name
          ? entity.name
          : state
            ? state.attributes.friendly_name
            : "unknown";
      const currentPosition = state ? state.attributes.current_position : "unknown";

      blind.querySelectorAll(".sc-blind-label").forEach((blindLabel) => {
        blindLabel.innerHTML = friendlyName;
      });

      const metrics = _this.getTrackMetrics(picture);
      const sheetOverlap = 1;

      slide.style.left = (metrics.left + sheetOverlap) + "px";
      slide.style.width = `calc(100% - ${metrics.left + metrics.right + (sheetOverlap * 2)}px)`;
      slide.style.top = metrics.min + "px";

      picker.style.left = (metrics.left + sheetOverlap) + "px";
      picker.style.width = `calc(100% - ${metrics.left + metrics.right + (sheetOverlap * 2)}px)`;
      picker.style.height = metrics.pickerHeight + "px";

      if (roller) {
        roller.style.left = "50%";
        roller.style.transform = "translateX(-50%)";
      }

      if (!_this.isUpdating) {
        blind.querySelectorAll(".sc-blind-position").forEach((blindPosition) => {
          blindPosition.innerHTML = currentPosition + "%";
        });

        if (invertPercentage) {
          _this.setPickerPositionPercentage(
            currentPosition,
            picker,
            slide,
            picture,
            pull,
            pullStem,
            dragIndicator
          );
        } else {
          _this.setPickerPositionPercentage(
            100 - currentPosition,
            picker,
            slide,
            picture,
            pull,
            pullStem,
            dragIndicator
          );
        }

        if (dragIndicator) {
          dragIndicator.classList.remove("show");
        }
      }
    });
  }

  setConfig(config) {
    if (!config.entities) {
      throw new Error("You need to define entities");
    }

    this.config = config;
    this.isUpdating = false;
  }

  getCardSize() {
    return this.config.entities.length + 1;
  }
}

customElements.define("lovelace-blind-card-enhanced", LovelaceBlindCardEnhanced);