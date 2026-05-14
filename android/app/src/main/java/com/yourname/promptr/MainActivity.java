package com.yourname.promptr;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.yourname.promptr.billing.PlayBillingPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PlayBillingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
