package com.baby.tracker;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.baby.tracker.inference.TFLitePlugin;
import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ReminderPlugin.class);
        registerPlugin(TFLitePlugin.class);
        registerPlugin(OcrPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
