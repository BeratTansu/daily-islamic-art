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

    // Samet karari (28/07): eser widget'i TAM doldursun, kirpilma kabul.
    // contain → cover: gorsel kutuyu doldurur, tasan kisim kirpilir.
    // padding ve ic borderRadius kaldirildi — cerceve olmayacaksa
    // ikisi de "ince krem cizgi" olarak geri gelirdi.
    // Boyutlar targetCell 4x3'e gore (app.config.ts ile birlikte degisir).
    return (
        <FlexWidget
            style={{
                height: 'match_parent',
                width: 'match_parent',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 16,
                backgroundColor: '#F5EDE1',
            }}
            clickAction="OPEN_APP"
        >
            <ImageWidget
                image={thumbUrl as `https:${string}`}
                imageWidth={340}
                imageHeight={240}
                resizeMode="cover"
                style={{ borderRadius: 16 }}
            />
        </FlexWidget>
    );
}