package it.sagraumbra.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

import java.io.File;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        clearServiceWorkerDir();
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.parseColor("#2A4B3C"));

        // White icons on dark green Cypress status bar
        WindowInsetsControllerCompat insetsController = WindowCompat.getInsetsController(window, window.getDecorView());
        if (insetsController != null) {
            insetsController.setAppearanceLightStatusBars(false);
        }

        // Clean dark theme navigation bar to match bottom navigation
        window.setNavigationBarColor(Color.parseColor("#1B352A"));

        // Single status bar inset on content view so status bar never overlaps web content
        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            ViewCompat.setOnApplyWindowInsetsListener(contentView, (v, windowInsets) -> {
                Insets statusBarInsets = windowInsets.getInsets(WindowInsetsCompat.Type.statusBars());
                v.setPadding(0, statusBarInsets.top, 0, 0);
                return windowInsets;
            });
        }
    }

    private void clearServiceWorkerDir() {
        try {
            File dataDir = getDataDir();
            File[] targets = new File[] {
                new File(dataDir, "app_webview/Default/Service Worker"),
                new File(dataDir, "app_webview/Service Worker")
            };
            for (File target : targets) {
                if (target.exists()) {
                    deleteRecursive(target);
                }
            }
        } catch (Throwable ignored) {}
    }

    private void deleteRecursive(File fileOrDirectory) {
        if (fileOrDirectory.isDirectory()) {
            File[] children = fileOrDirectory.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteRecursive(child);
                }
            }
        }
        fileOrDirectory.delete();
    }
}
