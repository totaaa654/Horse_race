import { HORSE_COLORS, type HorseColor } from '../assets/assetManifest';
import { HORSE_LIMITS } from '../config/gameConfig';

export const HORSE_COLOR_HEX: Record<HorseColor, string> = {
  red: '#e63b32',
  orange: '#ef7d20',
  yellow: '#f6c93d',
  green: '#62ad32',
  blue: '#2879db',
  violet: '#7545c7',
  pink: '#ed72ad',
  cyan: '#39c7d8',
};

export class GameSetup {
  private horseCount = 4;
  private activeHorseIndex = 0;
  private colors: Array<HorseColor | null> = [];
  private readonly countStep: HTMLElement;
  private readonly colorStep: HTMLElement;
  private readonly roster: HTMLElement;
  private readonly palette: HTMLElement;
  private readonly countSummary: HTMLElement;
  private readonly trackButton: HTMLButtonElement;

  public constructor(
    private readonly root: HTMLElement,
    private readonly onReady: (colors: HorseColor[]) => void,
  ) {
    this.countStep = this.requireElement('[data-setup-step="count"]');
    this.colorStep = this.requireElement('[data-setup-step="colors"]');
    this.roster = this.requireElement('[data-horse-roster]');
    this.palette = this.requireElement('[data-color-palette]');
    this.countSummary = this.requireElement('[data-count-summary]');
    this.trackButton = this.requireElement<HTMLButtonElement>('[data-go-track]');
    this.bindEvents();
    this.selectCount(this.horseCount);
    this.renderPalette();
  }

  public open(): void {
    this.showCountStep();
    this.root.querySelector<HTMLButtonElement>(`[data-horse-count="${this.horseCount}"]`)?.focus();
  }

  private bindEvents(): void {
    this.root.querySelectorAll<HTMLButtonElement>('[data-horse-count]').forEach((button) => {
      button.addEventListener('click', () => this.selectCount(Number(button.dataset.horseCount)));
    });

    this.requireElement<HTMLButtonElement>('[data-next-colors]').addEventListener('click', () => {
      this.colors = Array.from({ length: this.horseCount }, () => null);
      this.activeHorseIndex = 0;
      this.renderRoster();
      this.showColorStep();
    });

    this.requireElement<HTMLButtonElement>('[data-back-count]').addEventListener('click', () => {
      this.showCountStep();
    });

    this.requireElement<HTMLButtonElement>('[data-randomize]').addEventListener('click', () => {
      this.colors = this.shuffledColors().slice(0, this.horseCount);
      this.activeHorseIndex = 0;
      this.renderRoster();
      this.renderPalette();
    });

    this.trackButton.addEventListener('click', () => {
      if (this.colors.every((color): color is HorseColor => color !== null)) {
        this.onReady([...this.colors]);
      }
    });
  }

  private selectCount(count: number): void {
    if (count < HORSE_LIMITS.minimum || count > HORSE_LIMITS.maximum) return;
    this.horseCount = count;
    this.root.querySelectorAll<HTMLButtonElement>('[data-horse-count]').forEach((button) => {
      const isSelected = Number(button.dataset.horseCount) === count;
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
    });
    this.countSummary.textContent = `${count} horses will enter the track`;
  }

  private assignColor(color: HorseColor): void {
    const usedBy = this.colors.findIndex((selected) => selected === color);
    if (usedBy !== -1 && usedBy !== this.activeHorseIndex) return;
    this.colors[this.activeHorseIndex] = color;
    const nextEmpty = this.colors.findIndex((selected) => selected === null);
    if (nextEmpty !== -1) this.activeHorseIndex = nextEmpty;
    this.renderRoster();
    this.renderPalette();
  }

  private renderRoster(): void {
    this.roster.replaceChildren(
      ...this.colors.map((color, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'roster-horse';
        button.classList.toggle('is-active', index === this.activeHorseIndex);
        button.setAttribute('aria-pressed', String(index === this.activeHorseIndex));
        button.innerHTML = `<span class="roster-horse__number">${String(index + 1).padStart(2, '0')}</span><span class="roster-horse__name">Horse ${index + 1}</span><span class="roster-horse__choice">${color ?? 'Choose color'}</span>`;
        if (color) button.style.setProperty('--selected-color', HORSE_COLOR_HEX[color]);
        button.addEventListener('click', () => {
          this.activeHorseIndex = index;
          this.renderRoster();
          this.renderPalette();
        });
        return button;
      }),
    );

    const selectedCount = this.colors.filter(Boolean).length;
    this.trackButton.disabled = selectedCount !== this.horseCount;
    this.trackButton.querySelector('span')!.textContent =
      selectedCount === this.horseCount ? 'Proceed to racetrack' : `${selectedCount} of ${this.horseCount} selected`;
  }

  private renderPalette(): void {
    this.palette.replaceChildren(
      ...HORSE_COLORS.map((color) => {
        const button = document.createElement('button');
        const usedBy = this.colors.findIndex((selected) => selected === color);
        const isCurrent = this.colors[this.activeHorseIndex] === color;
        button.type = 'button';
        button.className = 'color-choice';
        button.classList.toggle('is-current', isCurrent);
        button.disabled = usedBy !== -1 && !isCurrent;
        button.style.setProperty('--swatch', HORSE_COLOR_HEX[color]);
        button.innerHTML = `<span class="color-choice__swatch"></span><span>${color}</span>`;
        button.addEventListener('click', () => this.assignColor(color));
        return button;
      }),
    );
  }

  private showCountStep(): void {
    this.countStep.hidden = false;
    this.colorStep.hidden = true;
  }

  private showColorStep(): void {
    this.countStep.hidden = true;
    this.colorStep.hidden = false;
    this.renderPalette();
    this.roster.querySelector<HTMLButtonElement>('.roster-horse')?.focus();
  }

  private shuffledColors(): HorseColor[] {
    const colors = [...HORSE_COLORS];
    for (let index = colors.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [colors[index], colors[randomIndex]] = [colors[randomIndex], colors[index]];
    }
    return colors;
  }

  private requireElement<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing setup element: ${selector}`);
    return element;
  }
}
