'use no memo';

import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { DailyArtworkWidget } from './DailyArtworkWidget';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000';

async function fetchDaily() {
    try {
        const res = await fetch(`${API_URL}/artworks/daily`);
        if (!res.ok) return { artistName: null, thumbUrl: null, error: true };

        const data = await res.json();

        return {
            artistName: data?.artist?.name ?? null,
            thumbUrl: data?.thumbUrl ?? data?.imageUrl ?? null,
            error: false,
        };
    } catch {
        return { artistName: null, thumbUrl: null, error: true };
    }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
    const { widgetInfo, widgetAction, renderWidget } = props;

    if (widgetInfo.widgetName !== 'DailyArtwork') return;

    switch (widgetAction) {
        case 'WIDGET_ADDED':
        case 'WIDGET_UPDATE':
        case 'WIDGET_RESIZED': {
            const data = await fetchDaily();
            renderWidget(<DailyArtworkWidget {...data} />);
            break;
        }

        default:
            break;
    }
}