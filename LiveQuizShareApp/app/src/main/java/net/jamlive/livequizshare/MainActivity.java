package net.jamlive.livequizshare;

import android.app.Activity;
import android.content.Intent;
import android.databinding.DataBindingUtil;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.util.Log;
import android.view.View;

import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdView;

import net.jamlive.livequizshare.databinding.ActivityMainBinding;

public class MainActivity extends Activity {
    ActivityMainBinding mBinding;
    private AdView mAdView;
    private AdListener AdmobAdListener = new AdListener() {
        @Override
        public void onAdLoaded() {
            super.onAdLoaded();
            Log.i("Admob Banner Ads","onAdLoaded");
        }
    };

    View.OnClickListener onBtnServiceStartListener = new View.OnClickListener() {
        @Override
        public void onClick(View view) {
            Intent intent = new Intent(getApplicationContext(), VoteServiceWnd.class);
            startService(intent);
            finish();
        }
    };

    View.OnClickListener onBtnServiceStopListener = new View.OnClickListener() {
        @Override
        public void onClick(View view) {
            Intent intent = new Intent(getApplicationContext(), VoteServiceWnd.class);
            stopService(intent);
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        mBinding = DataBindingUtil.setContentView(this, R.layout.activity_main);
        mBinding.btnServiceStart.setOnClickListener(onBtnServiceStartListener);
        mBinding.btnServiceStop.setOnClickListener(onBtnServiceStopListener);

        //MobileAds.initialize(this, getResources().getString(R.string.admob_app_id));
        MobileAds.initialize(this, "ca-app-pub-3940256099942544~3347511713");

        mBinding.adView.setAdListener(AdmobAdListener);

        AdRequest adRequest = new AdRequest.Builder()
                .addTestDevice(AdRequest.DEVICE_ID_EMULATOR)
                .build();

        mBinding.adView.loadAd(adRequest);
    }
}
