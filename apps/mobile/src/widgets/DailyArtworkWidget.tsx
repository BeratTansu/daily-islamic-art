'use no memo';

import React from 'react';
import { FlexWidget, ImageWidget, OverlapWidget, TextWidget } from 'react-native-android-widget';

export interface DailyArtworkWidgetProps {
    artistName: string | null;
    thumbUrl: string | null;
    error: boolean;
}

export function DailyArtworkWidget({ thumbUrl, error }: DailyArtworkWidgetProps) {
    // Bos durum: veri yoksa marka adiyla sade kutu.
    // Hata mesaji basmiyoruz — "yalan soylemeyen ama cirkin olmayan" bos durum.
    if (error || !thumbUrl) {
        return (
            <FlexWidget
                style={{
                    height: 'match_parent',
                    width: 'match_parent',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#F5EDE1',
                    borderRadius: 16,
                }}
                clickAction="OPEN_APP"
            >
                <TextWidget text="Daily Islamic Art" style={{ fontSize: 16, color: '#324130' }} />
            </FlexWidget>
        );
    }

    // OverlapWidget: FlexWidget'ta overflow yok, OverlapWidget'ta var.
    // Gorsel kutudan tasar, tasan kisim kirpilir → cerceve kalmaz, kose yuvarlakligi korunur.
    return (
        <FlexWidget
            style={{
                height: 'match_parent',
                width: 'match_parent',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 16,
                backgroundColor: '#F5EDE1',
                padding: 6,
            }}
            clickAction="OPEN_APP"
        >
            <ImageWidget
                image={thumbUrl as `https:${string}`}
                imageWidth={340}
                imageHeight={150}
                resizeMode="contain"
                style={{ borderRadius: 10 }}
            />
        </FlexWidget>
    );
}