package net.jamlive.livequizshare;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Message;
import android.support.annotation.Nullable;
import android.util.Log;
import android.util.TypedValue;
import android.view.LayoutInflater;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;

import com.github.mikephil.charting.charts.BarChart;
import com.github.mikephil.charting.charts.LineChart;
import com.github.mikephil.charting.components.XAxis;
import com.github.mikephil.charting.data.BarData;
import com.github.mikephil.charting.data.BarDataSet;
import com.github.mikephil.charting.data.BarEntry;
import com.github.mikephil.charting.data.Entry;
import com.github.mikephil.charting.data.LineData;
import com.github.mikephil.charting.data.LineDataSet;
import com.github.mikephil.charting.utils.ColorTemplate;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import io.socket.client.IO;
import io.socket.client.Socket;
import io.socket.emitter.Emitter;

public class VoteServiceWnd extends Service {
    private View mView;
    private Socket mSocket;
    final Handler handler = new Handler() {
        @Override
        public void handleMessage(Message msg) {
            super.handleMessage(msg);

            BarChart chart = mView.findViewById(R.id.chart);
            chart.invalidate();
        }
    };

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();

        LayoutInflater mInflater = (LayoutInflater) getSystemService(Context.LAYOUT_INFLATER_SERVICE);
        mView = mInflater.inflate(R.layout.vote_wnd, null);

        //최상위 윈도우에 넣기 위한 설정
        WindowManager.LayoutParams params;
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            params = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.TYPE_SYSTEM_OVERLAY,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                    PixelFormat.TRANSLUCENT);
        } else {
            params = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                    PixelFormat.TRANSLUCENT);
        }

        try {
            InitChart();

            mSocket = IO.socket("http://databucket.duckdns.org:4650");
            mSocket.on("vote_data", new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    JSONObject receivedData = (JSONObject) args[0];
                    try {
                        JSONObject jVoteData = receivedData.getJSONObject("vote_data");
                        JSONArray aVoteCnt = jVoteData.getJSONArray("cnt");

                        BarChart chart = mView.findViewById(R.id.chart);
                        XAxis xAxis = chart.getXAxis();
                        xAxis.setDrawLabels(true);

                        List<BarEntry> entries = new ArrayList<>();
                        entries.add(new BarEntry(1, aVoteCnt.getInt(0)));
                        entries.add(new BarEntry(2, aVoteCnt.getInt(1)));
                        entries.add(new BarEntry(3, aVoteCnt.getInt(2)));

                        BarDataSet dataSet = new BarDataSet(entries, "Numbers");
                        dataSet.setColors(new int[] { ColorTemplate.rgb("#DE5B49"), ColorTemplate.rgb("#3AA84B"), ColorTemplate.rgb("#F0CA4D")});
                        BarData barData = new BarData(dataSet);
                        barData.setBarWidth(0.3f);
                        chart.setData( barData );

                        Message msg= handler.obtainMessage();
                        handler.sendMessage(msg);

                    } catch (JSONException e) {
                        e.printStackTrace();
                    }
                }
            });
            mSocket.connect();

        } catch (URISyntaxException e) {
            e.printStackTrace();
        }

        WindowManager wm = (WindowManager)getSystemService(WINDOW_SERVICE); //  윈도우 매니져
        wm.addView(mView, params);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if(mView != null)        //서비스 종료시 뷰 제거. *중요 : 뷰를 꼭 제거 해야함.
        {
            ((WindowManager) getSystemService(WINDOW_SERVICE)).removeView(mView);
            mView = null;
        }

        if( mSocket != null ) {
            mSocket.disconnect();
        }
    }

    protected void InitChart() {
        BarChart chart = mView.findViewById(R.id.chart);

        chart.getXAxis().setGranularity(1.0f);
        chart.getXAxis().setGranularityEnabled(true);
        chart.getXAxis().setLabelCount(3);
        chart.getXAxis().setValueFormatter(new VoteXAxisValueFormatter(new String[]{"","1번","2번", "3번"}));

        chart.getAxisLeft().setGranularity(1.0f);
        chart.getAxisLeft().setGranularityEnabled(true);
    }
}
