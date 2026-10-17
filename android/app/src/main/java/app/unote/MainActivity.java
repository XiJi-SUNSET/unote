package app.unote;

import android.os.Bundle;

import androidx.activity.EdgeToEdge;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // 让内容铺到状态栏/导航栏后面，安全区交给 @capacitor-community/safe-area 处理
        EdgeToEdge.enable(this);
    }
}
