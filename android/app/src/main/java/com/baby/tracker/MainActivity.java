package com.baby.tracker;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ReminderPlugin.class);
        registerPlugin(OcrPlugin.class);
        registerPlugin(EntityExtractionPlugin.class);
        registerPlugin(ImageSharePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
