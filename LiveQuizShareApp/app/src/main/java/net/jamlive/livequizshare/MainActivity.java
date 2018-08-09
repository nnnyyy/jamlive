package net.jamlive.livequizshare;

import android.app.Activity;
import android.content.Intent;
import android.databinding.DataBindingUtil;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.util.Log;
import android.view.View;

import net.jamlive.livequizshare.databinding.ActivityMainBinding;

public class MainActivity extends Activity {
    ActivityMainBinding mBinding;
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
    }
}
