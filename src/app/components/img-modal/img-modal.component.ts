import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { CanvasService } from '../../services/canvas.service';
import { AiService } from '../../services/ai.service';

@Component({
    selector: 'app-img-modal',
    imports: [FormsModule],
    templateUrl: './img-modal.component.html',
    styleUrl: './img-modal.component.scss',
})
export class ImgModalComponent {
  @Input() visible = false;
  @Input() targetId: string | null = null;
  @Output() close = new EventEmitter<void>();

  imgPrompt = '';
  loading = false;
  results: (string | null)[] = [];
  selectedUrl: string | null = null;

  quickPrompts = [
    { label: '☕ Coffee',   value: 'Steaming artisan coffee cup, dark wood, moody lighting, photorealistic' },
    { label: '🎨 Abstract', value: 'Vibrant geometric abstract pattern, purple gold, digital art' },
    { label: '🌆 City',     value: 'City skyline golden hour, cinematic, high detail' },
    { label: '🌿 Nature',   value: 'Tropical leaves flat lay, vivid green, overhead shot' },
    { label: '💻 Product',  value: 'Sleek tech product minimal white background, studio lighting' },
  ];

  constructor(private cs: CanvasService, private ai: AiService) {}

  onOverlayClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('overlay')) this.doClose();
  }

  doClose() {
    this.close.emit();
    this.results = [];
    this.selectedUrl = null;
  }

  async generate() {
    if (!this.imgPrompt.trim()) return;
    this.loading = true;
    this.results = [];
    this.selectedUrl = null;

    try {
      this.results = await this.ai.generateImgVariants(this.imgPrompt);
    } finally {
      this.loading = false;
    }
  }

  insert() {
    if (!this.selectedUrl) return;
    if (this.targetId) {
      this.cs.setImageSrc(this.targetId, this.selectedUrl);
    } else {
      this.cs.addElement({ type:'img', x:80, y:80, w:300, h:300, src: this.selectedUrl });
    }
    this.doClose();
  }
}
