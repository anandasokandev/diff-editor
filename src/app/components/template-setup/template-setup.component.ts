import { Component, Output, EventEmitter } from '@angular/core';

import { FormsModule } from '@angular/forms';

export interface TemplateConfig {
    name: string;
    width: number;
    height: number;
    preset?: string;
}

interface SizePreset {
    label: string;
    sub: string;
    w: number;
    h: number;
    icon: string;
}

@Component({
    selector: 'app-template-setup',
    imports: [FormsModule],
    templateUrl: './template-setup.component.html',
    styleUrl: './template-setup.component.scss'
})
export class TemplateSetupComponent {
    @Output() created = new EventEmitter<TemplateConfig>();

    config: TemplateConfig = {
        name: 'Untitled Design',
        width: 1080,
        height: 1080,
    };

    selectedPreset = 'Instagram Post';

    sizePresets: SizePreset[] = [
        { label: 'Instagram Post', sub: 'Social', w: 1080, h: 1080, icon: '📸' },
        { label: 'Instagram Story', sub: 'Social', w: 1080, h: 1920, icon: '📱' },
        { label: 'Facebook Post', sub: 'Social', w: 1200, h: 628, icon: '👍' },
        { label: 'YouTube Thumb', sub: 'Video', w: 1280, h: 720, icon: '▶️' },
        { label: 'Twitter/X Post', sub: 'Social', w: 1600, h: 900, icon: '🐦' },
        { label: 'A4 Document', sub: 'Print', w: 2480, h: 3508, icon: '📄' },
        { label: 'Business Card', sub: 'Print', w: 1050, h: 600, icon: '💼' },
        { label: 'Poster', sub: 'Print', w: 1587, h: 2245, icon: '🎨' },
        { label: 'Presentation', sub: 'Slides', w: 1920, h: 1080, icon: '📊' },
        { label: 'Email Header', sub: 'Email', w: 600, h: 200, icon: '📧' },
    ];

    selectPreset(p: SizePreset) {
        this.selectedPreset = p.label;
        this.config.width = p.w;
        this.config.height = p.h;
    }

    onOverlayClick(e: MouseEvent) {
        // Don't close on overlay click — force user to create
    }

    onCreate() {
        if (!this.config.name.trim()) return;
        this.created.emit({ ...this.config });
    }
}
