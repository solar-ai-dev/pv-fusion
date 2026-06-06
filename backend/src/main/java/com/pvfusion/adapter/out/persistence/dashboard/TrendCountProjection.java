package com.pvfusion.adapter.out.persistence.dashboard;

import java.time.LocalDate;

public interface TrendCountProjection {

    LocalDate getTrendDate();

    long getCount();
}
