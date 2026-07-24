'use no memo';

import React from 'react';
import { FlexWidget, ImageWidget, TextWidget } from 'react-native-android-widget';

export interface DailyArtworkWidgetProps {
    artistName: string | null;
    thumbUrl: string | null;
    error: boolean;
}

export function DailyArtworkWidget({ thumbUrl, error }: DailyArtworkWidgetProps) {
    // Gorsel yoksa / hata varsa: marka adiyla sade bos durum.
    // "Yalan soylemeyen ama cirkin olmayan" — hata mesaji basmiyoruz.
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
            <ImageWidget
                image={thumbUrl as `https:${string}`}
                imageWidth={340}
                imageHeight={150}
                resizeMode="contain"
                style={{ borderRadius: 12 }}
            />
        </FlexWidget>
    );
}