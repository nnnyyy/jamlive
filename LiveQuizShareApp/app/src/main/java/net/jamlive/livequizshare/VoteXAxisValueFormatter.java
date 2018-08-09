package net.jamlive.livequizshare;

import com.github.mikephil.charting.components.AxisBase;
import com.github.mikephil.charting.formatter.IAxisValueFormatter;

public class VoteXAxisValueFormatter implements IAxisValueFormatter {
    private String[] mValues;

    public VoteXAxisValueFormatter(String[] values) {
        mValues = values;
    }

    @Override
    public String getFormattedValue(float value, AxisBase axis) {
        return mValues[(int)Math.floor(value)];
    }
}
