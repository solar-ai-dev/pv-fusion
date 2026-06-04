## 1. 실험 목적

MVP 초기 단계에서는 **RGB 단건 분석 모델**과 **열화상 단건 분석 모델**을 먼저 구축하여 서비스 적용 가능한 단일 모달 baseline을 확보

단건 분석 결과가 서비스 분석 흐름에 적용 가능한지 확인한 뒤, RGB-Thermal Fusion은 후속 고도화 실험으로 진행

Fusion 실험은 라벨 없는 RGB-Thermal 정상 pair와 synthetic paired dataset을 활용해 단건 baseline 대비 성능 개선 여부를 검증

모델 구조는 실험 전반에서 **YOLO26 계열로 고정**

---

## 2. 전체 실험 흐름

```
단건 데이터셋 선정 및 baseline 구성
→ YOLO26 RGB-only / Thermal-only 실험
→ 단건 모델 ONNX 서빙 검증
→ RGB-Thermal pair 데이터 생성
→ Synthetic paired dataset 생성 및 품질 검증
→ YOLO26 RGB-Thermal Fusion 후속 실험
→ 배포 최적화 및 최종 모델 선정
→ 실험 결과 아카이브 누적
```

---

## 3. 실험 방향 요약

| 구분 | 데이터셋 | 실험 방향 |
| --- | --- | --- |
| RGB 단건 | New Solar Panel RGB Faults / RGB 결함 source bank / synthetic RGB dataset / 혼합 데이터셋 | YOLO26 기반 RGB-only baseline을 먼저 학습하고 외관 결함, 오염, 음영, 파손 등 RGB 이상 후보 탐지 성능 확인 |
| 열화상 단건 | ThermoSolar-PV / Thermal 결함 source bank / synthetic Thermal dataset / 혼합 데이터셋 | YOLO26 기반 Thermal-only baseline을 먼저 학습하고 hotspot, diode, substring, string fault 계열 발열 이상 탐지 성능 확인 |
| 단건 배포 검증 | RGB-only / Thermal-only 최종 후보 모델 | YOLO26 ONNX 변환, CPU 추론, threshold, 결과 포맷, AI Worker 모델 라우팅 검증 |
| RGB-Thermal 정상 pair | O&M RGB-Thermal 정상 pair | Fusion 학습용 base dataset으로 사용하되, 단건 baseline 이후 pair 데이터 생성 단계에서 활용 |
| 패널/배열 Segmentation | 소량 수동 라벨링한 O&M RGB/Thermal 대표 샘플 | YOLO26-seg로 panel, array, background mask를 학습하고 라벨 없는 pair에 pseudo mask 생성 |
| Crop pair 생성 | O&M RGB-Thermal 정상 pair + pseudo mask | 동일 패널/배열 기준 RGB crop과 Thermal crop을 생성하고 pair 정합성 검증 |
| Source Bank 및 Synthetic Defect | 정상 crop pair + RGB/Thermal 결함 source bank | 결함 유형별 RGB/Thermal source bank를 구축하고 정상 crop pair 위에 결함을 합성하여 bbox, mask, class, severity, pair_type 자동 생성 |
| 품질 검증 | synthetic paired defect crop | Anomalib heatmap, generator mask/bbox, panel mask 품질, pair 정합성, class 정합성 검증 |
| Fusion 후속 실험 | synthetic RGB-Thermal paired dataset | 단건 baseline 확보 후 YOLO26 기반 Late Fusion 우선 실험, Early Fusion은 후순위 후보로 비교 |
| Fusion 배포 최적화 | 최종 Fusion 후보 모델 | YOLO26 Fusion 후보의 ONNX 변환, CPU 추론, INT8 양자화 적용 가능성 검토 |
| 최종 선정 | 단건 모델 + Fusion 후보 | 서비스 적용성, 성능, 추론 속도, ONNX 안정성, 결과 포맷 정합성 기준으로 최종 후보 선정 |

---

## 4. 하위 문서 구성

## 데이터셋 선정

### 태양광 이미지 분석 단위

cell < module < panel < array

---

### RGB-Thermal Fusion용 데이터셋 후보

**선정 기준**

- RGB, 열화상 이미지를 **단일 또는 pair 기반으로 분석**
- Fusion 모델은 공개 데이터셋을 그대로 사용하는 것이 아니라, **RGB-Thermal 정상 pair 기반 synthetic paired dataset**을 생성해 학습
- 정상 RGB-Thermal pair에서 패널 단위 crop을 생성하고, RGB 결함 / Thermal 발열 결함을 합성
- 합성 시점에 **Bounding Box, Heatmap, Mask** 형태로 시각화 가능한 라벨 생성
- 합성 시점에 class, severity를 함께 생성하여 **심각도와 우선순위** 산출에 활용
- 구역, Array, Panel, Module 단위로 결과를 누적 관리할 수 있도록 패널 단위 데이터 구성이 가능한지 확인

**품질 기준**

| 기호 | 의미 |
| --- | --- |
| **○** | RGB-Thermal pair 구성 또는 합성 데이터 생성에 적합하고, 촬영 환경·해상도·전처리 상태가 실험 목적에 비교적 적합 |
| **△** | 사용 가능하지만 pair 정합성, 라벨 신뢰도, 촬영 환경, 해상도, 불균형, 전처리 상태를 추가 확인해야 함 |
| **×** | RGB-Thermal pair 구성, 합성 데이터 생성, Fusion 실험 목적에 맞지 않아 현재 실험에는 부적합 |

**데이터셋 후보**

| 구분 | 데이터셋 이름 | 성격 | 라벨 | 규모 | 품질 |
| --- | --- | --- | --- | --- | --- |
| RGB-Thermal pair | O&M RGB-Thermal 정상 pair | 동일 구역 RGB·열화상 pair, 직접 수집/구성 | 정상 pair, 패널 crop 생성 필요 | 수집 규모에 따라 결정 | ○ |
| RGB | RGB Defects | UAV 프로젝트 기반으로 보이는 RGB 패널 결함 데이터 | bbox, Crack, Bird Drop, Cell crack, Delamination, Discoloration, Electrical Damage, Physical Damage, shading, Soiling 등 | 확인 필요 | ○ |
| RGB | Solar Panel Fault Dataset | RGB 패널 결함 탐지 데이터 | bbox, Snow, Bird Drop, Defective, Dust, Dusty, Non Defective, Physical Damage | 확인 필요 | ○~△ |
| RGB | New Solar Panel RGB Faults | RGB 패널 결함 segmentation 데이터 | instance segmentation, broken, snow, dusty, Electrical-Damage, missing, shading 등 | 확인 필요 | ○ |
| RGB | Solar Panel Images Clean and Faulty Images | 웹 수집 / 혼합 기반 RGB 패널 분류 데이터 | 6클래스 분류, Clean, Dusty, Bird-drop, Snow-Covered, Electrical-damage, Physical-Damage | 확인 필요 | △ |
| RGB | Photovoltaic Panel Defect Dataset | 합성 이미지 기반 RGB 패널 결함 데이터 | synthetic 이미지, scratch, crack, black spot, wear 등 | 확인 필요 | △~× |
| RGB | UAV Solar Panel Inspection Dataset | UAV RGB 기반 패널 결함 탐지 데이터 | COCO Object Detection, physical/electrical defects, dust, dirt, bird droppings 계열 | 확인 필요 | ○~△ |
| 열화상 | Thermal PV Panel Detection and Fault Detection Dataset for UAV-Based Inspection | UAV 열화상 구역/배열 데이터 | annotation / object detection, PV panel detection, fault detection | 353장 기준 | ○ |
| 열화상 | Photovoltaic System Thermography Dataset | 구역/배열 열화상 모듈 단위 데이터 | module polygon / quadrilateral annotation + binary defect label | 120장 기준 | ○~△ |
| 열화상 | Thermal Imaging Dataset for Hotspot Detection on Solar Panels | 열화상 hotspot segmentation 데이터 | segmentation, Hotspot, bird dropping 원인 열 이상 | 확인 필요 | △ |
| 열화상 | Solar Panel Hot Spots | 열화상 diode/hotspot 탐지 데이터 | object detection, diode, hotspot | 3,506장 | ○ |
| 열화상 | Photovoltaic Module Dataset, PVMD | 열화상 결함 분류 데이터 | class 분류, Hotspots, Cracks, Shadings | 1,000장 | ○ |
| 열화상 | Thermal Solar PV Anomaly Detection Dataset / ThermoSolar-PV | 열화상 anomaly 탐지 데이터 | object detection, Single Hotspot, Multi Hotspots, Single Diode, Multi Diode, Single Bypassed Substring, Multi Bypassed Substring, String Open Circuit, String Reversed Polarity | 확인 필요 | ○~△ |
- **RGB-Thermal 정상 pair**: Fusion 학습용 synthetic paired dataset을 만들기 위한 기준 데이터
- **정규화됨**: 이미지 크기, 각도, 위치 등이 일정하게 맞춰진 상태
- **annotation**: 라벨은 제공되지만 bbox, mask, class 중 어떤 형태인지 추가 확인이 필요한 상태
- **단건 데이터셋**: Fusion 모델에 직접 사용하는 것이 아니라 RGB-only / Thermal-only baseline 학습, 결함 합성 패턴 참고, 라벨 체계 설계에 활용
- **New Solar Panel RGB Faults**: RGB instance segmentation 기반이므로 RGB 결함 합성, mask 생성, RGB-only segmentation 또는 bbox 변환 실험에 활용
- **ThermoSolar-PV**: 열화상 anomaly bbox 기반이므로 Thermal-only bbox baseline, diode·hotspot·substring·string fault class 참고에 활용

---

### Synthetic Paired Dataset 구성 방향

Fusion 모델은 공개 데이터셋을 그대로 사용하는 것이 아니라, O&M RGB-Thermal 정상 pair를 기준으로 synthetic paired dataset을 생성해 학습

| 단계 | 내용 |
| --- | --- |
| Pair 구성 | 드론 위치에 매핑된 RGB 이미지명과 열화상 이미지명을 기준으로 pair 구성 |
| Crop 생성 | 동일 패널 영역을 기준으로 RGB crop과 Thermal crop 생성 |
| 결함 합성 | 정상 crop에 New Solar Panel RGB Faults의 RGB 외관 결함과 ThermoSolar-PV의 Thermal 발열 결함 합성 |
| 라벨 생성 | 합성 시점에 bbox, mask, class, severity 자동 생성 |
| 품질 검증 | Anomalib heatmap과 generator mask/bbox를 비교해 합성 데이터 사용 여부 판단 |

---

### 최종 선정 데이터셋

| 구분 | 선정 데이터셋 | 선정 이유 |
| --- | --- | --- |
| Fusion 데이터 생성 | **O&M RGB-Thermal 정상 pair** | 동일 구역의 RGB·열화상 이미지를 pair로 구성할 수 있으므로 패널 단위 crop pair 생성과 synthetic paired dataset 구축에 적합 |
| RGB 결함 합성 기준 | **New Solar Panel RGB Faults** | instance segmentation 기반 외관 이상 라벨을 제공하므로 RGB 결함 합성 패턴, mask 생성, class 설계, RGB-only baseline 비교에 활용 가능 |
| Thermal 발열 결함 기준 | **Thermal Solar PV Anomaly Detection Dataset / ThermoSolar-PV** | 열화상 anomaly bbox 라벨과 diode·hotspot·substring·string fault class를 제공하므로 Thermal-only bbox baseline, synthetic thermal 결함 합성, Fusion class 설계에 활용 가능 |

## RGB 단건 분석 실험

## 1. 목적

RGB 단일 이미지 기준 외관 이상 탐지 성능 확인

New Solar Panel RGB Faults 데이터셋을 사용하여 YOLO26-seg 기반 RGB-only baseline 선정

RGB-only baseline은 먼저 단건 분석 모델로 학습·검증하고, 이후 RGB-Thermal Fusion 후속 실험에서 단일 모달 비교 기준으로 사용

---

## 2. 비교 대상

| 구분 | 비교 항목 | 후보 |
| --- | --- | --- |
| 데이터셋 | 학습 데이터 | New Solar Panel RGB Faults |
| 모델 | Instance Segmentation 모델 구조 | YOLO26n-seg / YOLO26s-seg |
| 입력 해상도 | 모델 입력 크기 | 640×640 기본, 필요 시 512×512 / 768×768 추가 비교 |
| 데이터 증강 | Augmentation 파라미터 조합 | 기본값 유지 / 색상 변환 조정 / 기하 변환 조정 / 합성 증강 조정 |
| 후처리 | Threshold 설정 | confidence threshold |

본 실험은 YOLO26-seg 계열만 사용한다.

New Solar Panel RGB Faults는 instance segmentation 데이터셋이므로 YOLO26 detection 모델은 1차 RGB-only baseline 선정 범위에서 제외한다.

본 RGB 단건 실험은 New Solar Panel RGB Faults 단독 baseline 선정을 범위로 하며, synthetic RGB dataset과 공개+synthetic 혼합 데이터셋은 이번 1차 실험 범위에서 제외한다.

---

## 3. 공통 실험 조건

| 항목 | 기본 config |
| --- | --- |
| 기본 데이터셋 | New Solar Panel RGB Faults |
| 기본 모델 | YOLO26n-seg / YOLO26s-seg |
| 입력 해상도 | 640×640 |
| 학습 단위 | Roboflow 데이터셋 원본 이미지 기준 |
| 결함 유형 | broken, snow, bitki, dusty, Electrical-Damage, missing, shading |
| 라벨 형식 | instance segmentation mask, bbox, class |
| 출력 결과 | mask, bbox, class, confidence |
| Smoke train | 3~5 epoch |
| 1차 baseline epoch | 20~30 epoch |
| Batch size | 16 기준으로 통일, GPU 메모리 여유가 있는 경우 32를 시도할 수 있으나 기본 비교 조건에는 포함하지 않음. OOM 발생 시 8 또는 4로 낮추고 변경 사유 기록 |
| Seed | 42로 고정 |
| Optimizer | optimizer=auto 기준 YOLO26 기본 학습 설정 사용 |
| Learning rate | 기본값 우선 사용 |
| Scheduler | YOLO26 기본 scheduler 우선 사용 |
| Augmentation | 기본값 유지 조건을 우선 사용 |
| Train / Val / Test | Roboflow 제공 split 우선 사용 |
| 후처리 | confidence threshold 기준 조정 |
| 결과 시각화 | segmentation mask와 mask 기반 bbox를 함께 확인 |

---

## 4. 비교 실험 설계

본 실험은 모든 조합을 전부 탐색하지 않고, 이전 실험에서 확인한 조건을 다음 실험의 고정 조건으로 사용하는 순차 비교 방식으로 진행한다.

| 실험 ID | 비교 변수 | 비교 내용 | 수행 조건 |
| --- | --- | --- | --- |
| RGB-EXP-01 | 데이터셋 사용 가능성 검증 | New Solar Panel RGB Faults의 라벨 형식, 클래스 수, 클래스 분포, train/val/test split, 이미지 품질을 확인하고 YOLO26-seg 학습 가능 여부 확인 | 학습 전 데이터 점검 + smoke train 3~5 epoch |
| RGB-EXP-02 | 모델 구조 | YOLO26n-seg / YOLO26s-seg 중 RGB-only baseline에 적합한 모델 구조 비교 | New Solar Panel RGB Faults, 640×640, 20~30 epoch, batch size 16, seed 42, 기본값 유지 augmentation, optimizer=auto |
| RGB-EXP-03 | Augmentation 파라미터 조합 | 기본값 유지, 색상 변환 조정, 기하 변환 조정, 합성 증강 조정 조건에서 segmentation 성능과 mask 훼손 여부 비교 | RGB-EXP-02에서 선택한 모델 기준, 640×640, batch size 16, seed 42 |
| RGB-EXP-04 | 입력 해상도 | 512×512 / 640×640 / 768×768 중 성능과 추론 시간 균형 비교 | RGB-EXP-02에서 선택한 모델과 RGB-EXP-03에서 선택한 augmentation 조건 기준으로 수행 |
| RGB-EXP-05 | 후처리 Threshold | confidence threshold 변화에 따른 오탐·미탐 변화 확인 | 재학습 없이 validation/test 추론 결과 기준으로 수행 |

Augmentation 파라미터 조합은 단순히 증강 강도를 높이는 방식이 아니라, 결함 mask와 class 특징을 훼손하지 않는 범위에서 YOLO augmentation 파라미터를 조정하고 성능 변화를 확인하는 방식으로 수행한다.

| 조합 | 조정 대상 | 확인 내용 |
| --- | --- | --- |
| 기본값 유지 | YOLO26 기본 augmentation | baseline 학습 기준 |
| 색상 변환 조정 | hsv_h, hsv_s, hsv_v | snow, dusty, shading 등 색상·밝기 기반 class에 미치는 영향 확인 |
| 기하 변환 조정 | translate, scale, fliplr | 패널 위치 변화와 크기 변화에 대한 일반화 성능 확인 |
| 합성 증강 조정 | mosaic, copy_paste, close_mosaic | instance segmentation mask 유지와 결함 위치 맥락 보존 여부 확인 |

---

## 5. 평가 지표 및 선정 기준

### 5.1 핵심 평가 지표

| 지표 | 의미 | 사용 목적 |
| --- | --- | --- |
| mAP50-95-seg | IoU 0.50~0.95 평균 mask 정밀도 | RGB segmentation 모델의 종합 성능 비교 |
| mAP50-seg | IoU 0.50 기준 mask 평균 정밀도 | 결함 영역을 대략적으로 잘 잡는지 확인 |
| class별 Recall | class별 실제 결함을 얼마나 놓치지 않는지 확인 | broken, snow, bitki, dusty, Electrical-Damage, missing, shading 중 미탐이 큰 class 확인 |
| Precision | 예측한 이상 후보 중 실제 정답 비율 | 오탐이 많은지 확인 |
| Recall | 실제 결함 중 모델이 찾아낸 비율 | 전체 미탐이 많은지 확인 |
| F1-score | Precision과 Recall의 균형 | threshold와 최종 후보 비교 |
| 평균 latency | 이미지 1장 기준 평균 추론 시간 | 서비스 단건 분석 속도 확인 |

---

### 5.2 보조 평가 지표

| 지표 | 의미 | 사용 조건 |
| --- | --- | --- |
| mAP50-box / mAP50-95-box | mask 기반 bbox 위치 탐지 성능 | 화면에 bbox 시각화를 함께 제공할 때 참고 |
| confusion matrix | class 간 오분류 관계 | 특정 class가 자주 혼동될 때 확인 |
| FP 수 / FN 수 | 오탐·미탐 개수 | threshold 조정 실험에서 확인 |
| 모델 파일 크기 | 모델 용량 | n/s 모델 선택 시 배포 부담 참고 |
| GPU 메모리 사용량 | 학습·추론 시 메모리 사용량 | Colab 또는 로컬 환경에서 학습 가능성 판단 |
| mask 훼손 샘플 | augmentation 후 결함 mask가 왜곡되거나 결함 특징이 사라진 샘플 | augmentation 파라미터 조합 비교 시 확인 |

---

### 5.3 실험별 우선 지표

| 실험 ID | 핵심 지표 | 보조 지표 | 선정 기준 |
| --- | --- | --- | --- |
| RGB-EXP-01 | 라벨 정상 로딩 여부, 클래스 수, 클래스 분포, smoke train 성공 여부 | 샘플 overlay 품질, split 존재 여부 | YOLO26-seg 학습이 정상 실행되고 라벨·클래스가 문서 기준과 맞으면 채택 |
| RGB-EXP-02 | mAP50-95-seg, class별 Recall, 평균 latency | mAP50-seg, mAP50-box, 모델 크기 | YOLO26n-seg와 YOLO26s-seg 중 성능 대비 추론 비용이 좋은 모델 채택 |
| RGB-EXP-03 | mAP50-95-seg, class별 Recall, val-test gap | F1-score, 실패 케이스 수, mask 훼손 샘플 | augmentation 파라미터 조합이 일반화 성능을 개선하고 결함 mask 해석을 해치지 않으면 채택 |
| RGB-EXP-04 | mAP50-95-seg, 평균 latency, GPU 메모리 사용량 | mAP50-box, class별 Recall | 640×640을 기준으로 성능 개선 대비 추론 비용이 큰 해상도는 제외 |
| RGB-EXP-05 | Precision, Recall, F1-score, FP 수, FN 수 | PR curve, confidence별 F1-score | 오탐과 미탐 균형이 가장 좋은 confidence threshold 채택 |

---

### 5.4 최종 모델 선정 기준

| 판단 항목 | 기준 |
| --- | --- |
| 1순위 | mAP50-95-seg와 class별 Recall이 안정적인 모델 |
| 2순위 | 평균 latency와 모델 파일 크기가 서비스 적용 범위에 들어오는 모델 |
| 3순위 | 특정 class에서 심각한 미탐이 적은 모델 |
| 4순위 | mask와 bbox 시각화 결과가 사용자 화면에서 해석 가능한 모델 |
| 5순위 | ONNX 변환과 ONNX Runtime CPU 추론이 가능한 모델 |
| 최종 선택 | 성능, 추론 속도, 결과 포맷 정합성, 배포 가능성을 종합해 RGB-only baseline 후보 1개 선정 |

---

### 5.5 판정 기준

| 판정 | 기준 |
| --- | --- |
| 채택 | 핵심 지표가 비교 대상보다 우수하거나, 성능과 추론 비용 균형이 가장 좋아 다음 실험 또는 배포 후보로 사용할 수 있는 경우 |
| 보류 | 일부 성능은 확인되었지만 class 편차, 오탐·미탐, 추론 시간, 데이터 품질 문제로 추가 보정이 필요한 경우 |
| 제외 | 성능 개선이 없거나, 결과가 불안정하거나, 추론 비용이 커서 RGB-only baseline 또는 배포 후보로 부적합한 경우 |

---

## 6. 실험별 결과 기록 기준

각 실험은 실험 ID 기준으로 결과를 저장하고, 동일한 기록 항목을 사용한다.

| 기록 항목 | 설명 |
| --- | --- |
| 실험 ID | RGB-EXP-01 ~ RGB-EXP-05 |
| 비교 대상 | 해당 실험에서 비교한 데이터셋, 모델, 해상도, augmentation 파라미터 조합, threshold 조건 |
| 고정 조건 | 실험 중 변경하지 않은 config |
| Batch size | 기본값 16 사용 여부, 32 시도 여부, OOM 발생 시 8 또는 4로 낮춘 사유 |
| Seed | 실험 재현성을 위해 사용한 seed 값 |
| 핵심 지표 | 최종 판단에 우선 사용하는 지표 |
| 보조 지표 | 판단 보조에 사용하는 지표 |
| 결과 및 계산 기준 | test set 또는 validation/test 추론 결과에서 지표를 계산한 기준 |
| 최종 선택 | 실험 결과에 따라 선택한 방식 |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | 모델 파일, 학습 로그, metric 결과, confusion matrix, 예측 이미지, mask/bbox overlay, augmentation 파라미터 기록 파일, ONNX 파일 경로 |
| 메모 | 결과 해석, 문제점, 다음 조치 |

### RGB-EXP-01. 데이터셋 사용 가능성 검증

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | RGB 데이터셋 사용 가능성 검증 |
| 비교 대상 | New Solar Panel RGB Faults |
| 고정 조건 | YOLO26-seg, 640×640, smoke train 3~5 epoch, seed 42 |
| Batch size | 16 기준, OOM 발생 시 8 또는 4로 낮추고 변경 사유 기록 |
| Seed | 42 |
| 핵심 지표 | 라벨 정상 로딩 여부, 클래스 수, 클래스 분포, smoke train 성공 여부 |
| 보조 지표 | 샘플 overlay 품질, train/val/test split 존재 여부 |
| 결과 및 계산 기준 | data.yaml, labels txt, 샘플 overlay, smoke train 로그 기준으로 학습 가능 여부 확인 |
| 최종 선택 |  |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | 데이터셋 구조 점검 결과, 클래스 분포 표, 샘플 overlay, smoke train 로그 |
| 메모 |  |

### RGB-EXP-02. 모델 구조 비교

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | RGB YOLO26-seg 모델 구조 비교 |
| 비교 대상 | YOLO26n-seg / YOLO26s-seg |
| 고정 조건 | New Solar Panel RGB Faults, 640×640, 20~30 epoch, batch size 16, seed 42, 기본값 유지 augmentation, optimizer=auto |
| Batch size | 16 기준, 32 시도 시 참고 결과로만 기록, OOM 발생 시 8 또는 4로 낮추고 변경 사유 기록 |
| Seed | 42 |
| 핵심 지표 | mAP50-95-seg, class별 Recall, 평균 latency |
| 보조 지표 | mAP50-seg, mAP50-box, 모델 파일 크기 |
| 결과 및 계산 기준 | 동일 validation/test split에서 모델별 segmentation 성능, class별 성능, 추론 시간 비교 |
| 최종 선택 |  |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | best.pt, last.pt, results.csv, confusion matrix, validation prediction overlay |
| 메모 |  |

### RGB-EXP-03. Augmentation 파라미터 조합 비교

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | RGB Augmentation 파라미터 조합 비교 |
| 비교 대상 | 기본값 유지 / 색상 변환 조정 / 기하 변환 조정 / 합성 증강 조정 |
| 고정 조건 | RGB-EXP-02에서 선택한 모델, 640×640, New Solar Panel RGB Faults, batch size 16, seed 42 |
| Batch size | 16 기준, OOM 발생 시 8 또는 4로 낮추고 변경 사유 기록 |
| Seed | 42 |
| 핵심 지표 | mAP50-95-seg, class별 Recall, val-test gap |
| 보조 지표 | F1-score, 실패 케이스 수, mask 훼손 샘플 |
| 결과 및 계산 기준 | 동일 validation/test split에서 augmentation 파라미터 조합별 segmentation 성능과 mask 품질을 비교 |
| 최종 선택 |  |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | augmentation 파라미터 기록 파일, results.csv, class별 성능표, 실패 케이스 샘플, mask 훼손 샘플 |
| 메모 |  |

### RGB-EXP-04. 입력 해상도 비교

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | RGB 입력 해상도 비교 |
| 비교 대상 | 512×512 / 640×640 / 768×768 |
| 고정 조건 | RGB-EXP-02에서 선택한 모델, RGB-EXP-03에서 선택한 augmentation 조건, New Solar Panel RGB Faults, batch size 16, seed 42 |
| Batch size | 16 기준, OOM 발생 시 8 또는 4로 낮추고 변경 사유 기록 |
| Seed | 42 |
| 핵심 지표 | mAP50-95-seg, 평균 latency, GPU 메모리 사용량 |
| 보조 지표 | mAP50-box, class별 Recall |
| 결과 및 계산 기준 | 동일 validation/test split에서 해상도별 segmentation 성능과 추론 시간 비교 |
| 최종 선택 |  |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | 해상도별 results.csv, validation prediction overlay, 추론 시간 측정 결과 |
| 메모 |  |

### RGB-EXP-05. Threshold 비교

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | RGB Threshold 비교 |
| 비교 대상 | confidence threshold 후보 |
| 고정 조건 | RGB-EXP-02에서 선택한 모델, RGB-EXP-03에서 선택한 augmentation 조건, RGB-EXP-04에서 선택한 해상도, seed 42 |
| Batch size | 해당 없음 |
| Seed | 42 |
| 핵심 지표 | Precision, Recall, F1-score, FP 수, FN 수 |
| 보조 지표 | PR curve, confidence별 F1-score |
| 결과 및 계산 기준 | 재학습 없이 validation/test 추론 결과에서 threshold 변경에 따른 오탐·미탐 변화 확인 |
| 최종 선택 |  |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | threshold별 metric 표, PR curve, 실패 케이스 overlay |
| 메모 |  |

---

## 7. 단건 배포 검증

RGB-only baseline 후보를 선정한 뒤, 서비스 적용 가능성을 확인하기 위해 배포 검증을 수행

| 검증 항목 | 확인 내용 | 주요 지표 |
| --- | --- | --- |
| ONNX 변환 | YOLO26 RGB-only 후보 모델을 ONNX 형식으로 변환 가능한지 확인 | 변환 성공 여부 |
| CPU 추론 | ONNX Runtime CPU 기준 추론이 가능한지 확인 | CPU latency, 추론 성공 여부 |
| 입력 크기 | 선정된 입력 해상도 기준 전처리와 추론 입력 shape가 안정적인지 확인 | 입력 shape 정합성 |
| 결과 포맷 | mask, bbox, class, confidence 결과가 AI Worker 결과 포맷과 맞는지 확인 | 결과 필드 정합성 |
| Threshold 적용 | 선정된 confidence threshold 적용 가능성 확인 | threshold 적용 후 Precision, Recall |
| 모델 라우팅 | RGB 단건 입력 시 AI Worker가 RGB-only 모델로 라우팅하는지 확인 | routing 성공 여부 |
| 시각화 저장 | mask와 bbox 결과 이미지를 저장소에 저장 가능한지 확인 | 저장 성공 여부, overlay 품질 |

---

## 8. 후속 실험

1차 실험에서 성능이 부족하거나 특정 문제가 확인된 경우에만 제한적으로 수행

단건 RGB-only baseline이 확정된 이후 RGB-Thermal Fusion 후속 실험에서 단일 모달 비교 기준으로 사용

| 구분 | 후속 비교 항목 | 수행 조건 |
| --- | --- | --- |
| Learning rate | 기본값 / 낮은 LR / 높은 LR | loss 수렴이 불안정하거나 validation 성능이 흔들릴 때 |
| 클래스 보정 | class weight, oversampling, rare class 중심 샘플링 | 특정 class Recall이 낮을 때 |
| Epoch 조정 | 20~30 epoch 이후 epoch 증가 검토 | train/val loss가 계속 개선되는데 학습이 중단된 경우 |
| Batch size 확장 | 16 기준 학습이 안정적으로 완료되고 GPU 메모리 여유가 충분할 때 32를 선택적으로 시도 | 기본 비교 조건에는 포함하지 않고 참고 결과로만 기록 |
| 데이터 보강 | synthetic RGB defect dataset 추가 또는 공개+synthetic 혼합 | RGB-only 단독 baseline 확정 후 synthetic 데이터가 실제 생성된 경우에만 별도 후속 실험으로 수행 |
| Fusion 연계 | RGB-only 최종 후보 모델을 Fusion 후속 실험의 단일 모달 비교 기준으로 사용 | RGB-only baseline 확정 후 수행 |

## 열화상 단건 분석 실험

## 1. 목적

열화상 단일 이미지 기준 발열 이상 탐지 성능 확인

ThermoSolar-PV 데이터셋을 사용하여 YOLO26 기반 Thermal-only detection baseline 선정

Thermal-only baseline은 먼저 단건 분석 모델로 학습·검증하고, 이후 RGB-Thermal Fusion 후속 실험에서 단일 모달 비교 기준으로 사용

---

## 2. 비교 대상

| 구분 | 비교 항목 | 후보 |
| --- | --- | --- |
| 데이터셋 | 학습 데이터 | ThermoSolar-PV |
| 모델 | Object Detection 모델 구조 | YOLO26n / YOLO26s |
| 입력 해상도 | 모델 입력 크기 | 640×640 기본, 필요 시 512×512 / 768×768 추가 비교 |
| 데이터 증강 | Augmentation 파라미터 조합 | 기본값 유지 / 명암·대비 조정 / 기하 변환 조정 / 합성 증강 조정 |
| 후처리 | Threshold 설정 | confidence threshold / NMS IoU 또는 YOLO26 기본 후처리 설정 |

본 실험은 YOLO26 detection 계열만 사용한다.

ThermoSolar-PV는 bbox 기반 열화상 anomaly 탐지 데이터셋이므로 YOLO26-seg 모델은 1차 Thermal-only baseline 선정 범위에서 제외한다.

본 열화상 단건 실험은 ThermoSolar-PV 단독 baseline 선정을 범위로 하며, synthetic Thermal dataset과 공개+synthetic 혼합 데이터셋은 이번 1차 실험 범위에서 제외한다.

---

## 3. 공통 실험 조건

| 항목 | 기본 config |
| --- | --- |
| 기본 데이터셋 | ThermoSolar-PV |
| 기본 모델 | YOLO26n / YOLO26s |
| 입력 해상도 | 640×640 |
| 학습 단위 | ThermoSolar-PV 원본 이미지 기준 |
| 결함 유형 | Single Hotspot, Multi Hotspots, Single Diode, Multi Diode, Single Bypassed Substring, Multi Bypassed Substring, String Open Circuit, String Reversed Polarity |
| 라벨 형식 | bbox, class |
| 출력 결과 | bbox, class, confidence |
| Smoke train | 3~5 epoch |
| 1차 baseline epoch | 20~30 epoch |
| Batch size | 16 기준으로 통일, GPU 메모리 여유가 있는 경우 32를 시도할 수 있으나 기본 비교 조건에는 포함하지 않음. OOM 발생 시 8 또는 4로 낮추고 변경 사유 기록 |
| Seed | 42로 고정 |
| Optimizer | optimizer=auto 기준 YOLO26 기본 학습 설정 사용 |
| Learning rate | 기본값 우선 사용 |
| Scheduler | YOLO26 기본 scheduler 우선 사용 |
| Augmentation | 기본값 유지 조건을 우선 사용 |
| Train / Val / Test | ThermoSolar-PV 제공 split 우선 사용, 없거나 경로가 맞지 않으면 실험용 split 생성 여부 확인 |
| 후처리 | confidence threshold와 NMS IoU 또는 YOLO26 기본 후처리 기준 조정 |
| 결과 시각화 | bbox, class, confidence overlay를 확인 |

---

## 4. 비교 실험 설계

본 실험은 모든 조합을 전부 탐색하지 않고, 이전 실험에서 확인한 조건을 다음 실험의 고정 조건으로 사용하는 순차 비교 방식으로 진행한다.

| 실험 ID | 비교 변수 | 비교 내용 | 수행 조건 |
| --- | --- | --- | --- |
| TH-EXP-01 | 데이터셋 사용 가능성 검증 | ThermoSolar-PV의 라벨 형식, 클래스 수, 클래스 분포, train/val/test split, 이미지 품질을 확인하고 YOLO26 detection 학습 가능 여부 확인 | 학습 전 데이터 점검 + smoke train 3~5 epoch |
| TH-EXP-02 | 모델 구조 | YOLO26n / YOLO26s 중 Thermal-only baseline에 적합한 모델 구조 비교 | ThermoSolar-PV, 640×640, 20~30 epoch, batch size 16, seed 42, 기본값 유지 augmentation, optimizer=auto |
| TH-EXP-03 | Augmentation 파라미터 조합 | 기본값 유지, 명암·대비 조정, 기하 변환 조정, 합성 증강 조정 조건에서 detection 성능과 발열 패턴 훼손 여부 비교 | TH-EXP-02에서 선택한 모델 기준, 640×640, batch size 16, seed 42 |
| TH-EXP-04 | 입력 해상도 | 512×512 / 640×640 / 768×768 중 탐지 성능과 추론 시간 균형 비교 | TH-EXP-02에서 선택한 모델과 TH-EXP-03에서 선택한 augmentation 조건 기준으로 수행 |
| TH-EXP-05 | 후처리 Threshold | confidence threshold와 NMS IoU 또는 YOLO26 기본 후처리 설정 변화에 따른 오탐·미탐 변화 확인 | 재학습 없이 validation/test 추론 결과 기준으로 수행 |

Augmentation 파라미터 조합은 단순히 증강 강도를 높이는 방식이 아니라, 열화상 발열 패턴과 bbox class 특징을 훼손하지 않는 범위에서 YOLO augmentation 파라미터를 조정하고 성능 변화를 확인하는 방식으로 수행한다.

| 조합 | 조정 대상 | 확인 내용 |
| --- | --- | --- |
| 기본값 유지 | YOLO26 기본 augmentation | baseline 학습 기준 |
| 명암·대비 조정 | hsv_v 또는 brightness/contrast 계열 설정 | hotspot, diode, substring 등 발열 패턴이 왜곡되는지 확인 |
| 기하 변환 조정 | translate, scale, fliplr | 촬영 위치 변화와 패널 크기 변화에 대한 일반화 성능 확인 |
| 합성 증강 조정 | mosaic, mixup, close_mosaic | bbox 유지와 발열 이상 위치 맥락 보존 여부 확인 |

---

## 5. 평가 지표 및 선정 기준

### 5.1 핵심 평가 지표

| 지표 | 의미 | 사용 목적 |
| --- | --- | --- |
| mAP50-95-box | IoU 0.50~0.95 평균 bbox 정밀도 | Thermal detection 모델의 종합 성능 비교 |
| mAP50-box | IoU 0.50 기준 bbox 평균 정밀도 | 발열 이상 영역을 대략적으로 잘 찾는지 확인 |
| class별 Recall | class별 실제 결함을 얼마나 놓치지 않는지 확인 | hotspot, diode, substring, string fault 중 미탐이 큰 class 확인 |
| Precision | 예측한 이상 후보 중 실제 정답 비율 | 오탐이 많은지 확인 |
| Recall | 실제 결함 중 모델이 찾아낸 비율 | 전체 미탐이 많은지 확인 |
| F1-score | Precision과 Recall의 균형 | threshold와 최종 후보 비교 |
| 평균 latency | 이미지 1장 기준 평균 추론 시간 | 서비스 단건 분석 속도 확인 |

---

### 5.2 보조 평가 지표

| 지표 | 의미 | 사용 조건 |
| --- | --- | --- |
| confusion matrix | class 간 오분류 관계 | hotspot과 diode 등 특정 class가 자주 혼동될 때 확인 |
| FP 수 / FN 수 | 오탐·미탐 개수 | threshold 조정 실험에서 확인 |
| 모델 파일 크기 | 모델 용량 | n/s 모델 선택 시 배포 부담 참고 |
| GPU 메모리 사용량 | 학습·추론 시 메모리 사용량 | Colab 또는 로컬 환경에서 학습 가능성 판단 |
| bbox overlay 품질 | 예측 bbox가 실제 발열 이상 영역을 해석 가능하게 표시하는지 확인 | 결과 시각화 검수 시 확인 |
| 발열 패턴 훼손 샘플 | augmentation 후 발열 패턴이 왜곡되거나 class 특징이 사라진 샘플 | augmentation 파라미터 조합 비교 시 확인 |

---

### 5.3 실험별 우선 지표

| 실험 ID | 핵심 지표 | 보조 지표 | 선정 기준 |
| --- | --- | --- | --- |
| TH-EXP-01 | 라벨 정상 로딩 여부, 클래스 수, 클래스 분포, smoke train 성공 여부 | 샘플 bbox overlay 품질, split 존재 여부 | YOLO26 detection 학습이 정상 실행되고 라벨·클래스가 문서 기준과 맞으면 채택 |
| TH-EXP-02 | mAP50-95-box, class별 Recall, 평균 latency | mAP50-box, 모델 크기 | YOLO26n과 YOLO26s 중 성능 대비 추론 비용이 좋은 모델 채택 |
| TH-EXP-03 | mAP50-95-box, class별 Recall, val-test gap | F1-score, 실패 케이스 수, 발열 패턴 훼손 샘플 | augmentation 파라미터 조합이 일반화 성능을 개선하고 발열 패턴 해석을 해치지 않으면 채택 |
| TH-EXP-04 | mAP50-95-box, 평균 latency, GPU 메모리 사용량 | mAP50-box, class별 Recall | 640×640을 기준으로 성능 개선 대비 추론 비용이 큰 해상도는 제외 |
| TH-EXP-05 | Precision, Recall, F1-score, FP 수, FN 수 | PR curve, confidence별 F1-score | 오탐과 미탐 균형이 가장 좋은 confidence threshold와 NMS IoU 조건 채택 |

---

### 5.4 최종 모델 선정 기준

| 판단 항목 | 기준 |
| --- | --- |
| 1순위 | mAP50-95-box와 class별 Recall이 안정적인 모델 |
| 2순위 | 평균 latency와 모델 파일 크기가 서비스 적용 범위에 들어오는 모델 |
| 3순위 | hotspot, diode, substring, string fault 계열에서 심각한 미탐이 적은 모델 |
| 4순위 | bbox 시각화 결과가 사용자 화면에서 해석 가능한 모델 |
| 5순위 | ONNX 변환과 ONNX Runtime CPU 추론이 가능한 모델 |
| 최종 선택 | 성능, 추론 속도, 결과 포맷 정합성, 배포 가능성을 종합해 Thermal-only baseline 후보 1개 선정 |

---

### 5.5 판정 기준

| 판정 | 기준 |
| --- | --- |
| 채택 | 핵심 지표가 비교 대상보다 우수하거나, 성능과 추론 비용 균형이 가장 좋아 다음 실험 또는 배포 후보로 사용할 수 있는 경우 |
| 보류 | 일부 성능은 확인되었지만 class 편차, 오탐·미탐, 추론 시간, 데이터 품질 문제로 추가 보정이 필요한 경우 |
| 제외 | 성능 개선이 없거나, 결과가 불안정하거나, 추론 비용이 커서 Thermal-only baseline 또는 배포 후보로 부적합한 경우 |

---

## 6. 실험별 결과 기록 기준

각 실험은 실험 ID 기준으로 결과를 저장하고, 동일한 기록 항목을 사용한다.

| 기록 항목 | 설명 |
| --- | --- |
| 실험 ID | TH-EXP-01 ~ TH-EXP-05 |
| 비교 대상 | 해당 실험에서 비교한 데이터셋, 모델, 해상도, augmentation 파라미터 조합, threshold 조건 |
| 고정 조건 | 실험 중 변경하지 않은 config |
| Batch size | 기본값 16 사용 여부, 32 시도 여부, OOM 발생 시 8 또는 4로 낮춘 사유 |
| Seed | 실험 재현성을 위해 사용한 seed 값 |
| 핵심 지표 | 최종 판단에 우선 사용하는 지표 |
| 보조 지표 | 판단 보조에 사용하는 지표 |
| 결과 및 계산 기준 | test set 또는 validation/test 추론 결과에서 지표를 계산한 기준 |
| 최종 선택 | 실험 결과에 따라 선택한 방식 |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | 모델 파일, 학습 로그, metric 결과, confusion matrix, 예측 이미지, bbox overlay, augmentation 파라미터 기록 파일, ONNX 파일 경로 |
| 메모 | 결과 해석, 문제점, 다음 조치 |

### TH-EXP-01. 데이터셋 사용 가능성 검증

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Thermal 데이터셋 사용 가능성 검증 |
| 비교 대상 | ThermoSolar-PV |
| 고정 조건 | YOLO26, 640×640, smoke train 3~5 epoch, seed 42 |
| Batch size | 16 기준, OOM 발생 시 8 또는 4로 낮추고 변경 사유 기록 |
| Seed | 42 |
| 핵심 지표 | 라벨 정상 로딩 여부, 클래스 수, 클래스 분포, smoke train 성공 여부 |
| 보조 지표 | 샘플 bbox overlay 품질, train/val/test split 존재 여부 |
| 결과 및 계산 기준 | data.yaml, labels txt, 샘플 bbox overlay, smoke train 로그 기준으로 학습 가능 여부 확인 |
| 최종 선택 |  |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | 데이터셋 구조 점검 결과, 클래스 분포 표, 샘플 bbox overlay, smoke train 로그 |
| 메모 |  |

### TH-EXP-02. 모델 구조 비교

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Thermal YOLO26 detection 모델 구조 비교 |
| 비교 대상 | YOLO26n / YOLO26s |
| 고정 조건 | ThermoSolar-PV, 640×640, 20~30 epoch, batch size 16, seed 42, 기본값 유지 augmentation, optimizer=auto |
| Batch size | 16 기준, 32 시도 시 참고 결과로만 기록, OOM 발생 시 8 또는 4로 낮추고 변경 사유 기록 |
| Seed | 42 |
| 핵심 지표 | mAP50-95-box, class별 Recall, 평균 latency |
| 보조 지표 | mAP50-box, 모델 파일 크기 |
| 결과 및 계산 기준 | 동일 validation/test split에서 모델별 detection 성능, class별 성능, 추론 시간 비교 |
| 최종 선택 |  |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | best.pt, last.pt, results.csv, confusion matrix, validation prediction bbox overlay |
| 메모 |  |

### TH-EXP-03. Augmentation 파라미터 조합 비교

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Thermal Augmentation 파라미터 조합 비교 |
| 비교 대상 | 기본값 유지 / 명암·대비 조정 / 기하 변환 조정 / 합성 증강 조정 |
| 고정 조건 | TH-EXP-02에서 선택한 모델, 640×640, ThermoSolar-PV, batch size 16, seed 42 |
| Batch size | 16 기준, OOM 발생 시 8 또는 4로 낮추고 변경 사유 기록 |
| Seed | 42 |
| 핵심 지표 | mAP50-95-box, class별 Recall, val-test gap |
| 보조 지표 | F1-score, 실패 케이스 수, 발열 패턴 훼손 샘플 |
| 결과 및 계산 기준 | 동일 validation/test split에서 augmentation 파라미터 조합별 detection 성능과 bbox 품질을 비교 |
| 최종 선택 |  |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | augmentation 파라미터 기록 파일, results.csv, class별 성능표, 실패 케이스 샘플, 발열 패턴 훼손 샘플 |
| 메모 |  |

### TH-EXP-04. 입력 해상도 비교

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Thermal 입력 해상도 비교 |
| 비교 대상 | 512×512 / 640×640 / 768×768 |
| 고정 조건 | TH-EXP-02에서 선택한 모델, TH-EXP-03에서 선택한 augmentation 조건, ThermoSolar-PV, batch size 16, seed 42 |
| Batch size | 16 기준, OOM 발생 시 8 또는 4로 낮추고 변경 사유 기록 |
| Seed | 42 |
| 핵심 지표 | mAP50-95-box, 평균 latency, GPU 메모리 사용량 |
| 보조 지표 | mAP50-box, class별 Recall |
| 결과 및 계산 기준 | 동일 validation/test split에서 해상도별 detection 성능과 추론 시간 비교 |
| 최종 선택 |  |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | 해상도별 results.csv, validation prediction bbox overlay, 추론 시간 측정 결과 |
| 메모 |  |

### TH-EXP-05. Threshold 비교

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Thermal Threshold 비교 |
| 비교 대상 | confidence threshold / NMS IoU |
| 고정 조건 | TH-EXP-02에서 선택한 모델, TH-EXP-03에서 선택한 augmentation 조건, TH-EXP-04에서 선택한 해상도, seed 42 |
| Batch size | 해당 없음 |
| Seed | 42 |
| 핵심 지표 | Precision, Recall, F1-score, FP 수, FN 수 |
| 보조 지표 | PR curve, confidence별 F1-score |
| 결과 및 계산 기준 | 재학습 없이 validation/test 추론 결과에서 threshold 변경에 따른 오탐·미탐 변화 확인 |
| 최종 선택 |  |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | threshold별 metric 표, PR curve, 실패 케이스 bbox overlay |
| 메모 |  |

---

## 7. 단건 배포 검증

Thermal-only baseline 후보를 선정한 뒤, 서비스 적용 가능성을 확인하기 위해 배포 검증을 수행

| 검증 항목 | 확인 내용 | 주요 지표 |
| --- | --- | --- |
| ONNX 변환 | YOLO26 Thermal-only 후보 모델을 ONNX 형식으로 변환 가능한지 확인 | 변환 성공 여부 |
| CPU 추론 | ONNX Runtime CPU 기준 추론이 가능한지 확인 | CPU latency, 추론 성공 여부 |
| 입력 크기 | 선정된 입력 해상도 기준 전처리와 추론 입력 shape가 안정적인지 확인 | 입력 shape 정합성 |
| 결과 포맷 | bbox, class, confidence 결과가 AI Worker 결과 포맷과 맞는지 확인 | 결과 필드 정합성 |
| Threshold 적용 | 선정된 confidence threshold와 NMS IoU 적용 가능성 확인 | threshold 적용 후 Precision, Recall |
| 모델 라우팅 | Thermal 단건 입력 시 AI Worker가 Thermal-only 모델로 라우팅하는지 확인 | routing 성공 여부 |
| 시각화 저장 | bbox 결과 이미지를 저장소에 저장 가능한지 확인 | 저장 성공 여부, bbox overlay 품질 |

---

## 8. 후속 실험

1차 실험에서 성능이 부족하거나 특정 문제가 확인된 경우에만 제한적으로 수행

단건 Thermal-only baseline이 확정된 이후 RGB-Thermal Fusion 후속 실험에서 단일 모달 비교 기준으로 사용

| 구분 | 후속 비교 항목 | 수행 조건 |
| --- | --- | --- |
| Learning rate | 기본값 / 낮은 LR / 높은 LR | loss 수렴이 불안정하거나 validation 성능이 흔들릴 때 |
| 클래스 보정 | class weight, oversampling, rare class 중심 샘플링 | 특정 class Recall이 낮을 때 |
| Epoch 조정 | 20~30 epoch 이후 epoch 증가 검토 | train/val loss가 계속 개선되는데 학습이 중단된 경우 |
| Batch size 확장 | 16 기준 학습이 안정적으로 완료되고 GPU 메모리 여유가 충분할 때 32를 선택적으로 시도 | 기본 비교 조건에는 포함하지 않고 참고 결과로만 기록 |
| 데이터 보강 | synthetic Thermal defect dataset 추가 또는 공개+synthetic 혼합 | Thermal-only 단독 baseline 확정 후 synthetic 데이터가 실제 생성된 경우에만 별도 후속 실험으로 수행 |
| Fusion 연계 | Thermal-only 최종 후보 모델을 Fusion 후속 실험의 단일 모달 비교 기준으로 사용 | Thermal-only baseline 확정 후 수행 |

## 단건 모델 배포 최적화 실험

## 1. 목적

RGB-only / Thermal-only 최종 후보 모델의 서비스 배포 가능성 검증

PyTorch 모델을 ONNX 형식으로 변환하고, ONNX Runtime 기반 CPU 단건 추론이 가능한지 확인

필요한 경우 ONNX INT8 양자화를 추가 검토하여 정확도 손실, 추론 시간, 모델 크기 변화를 비교

본 실험은 RGB 담당자와 Thermal 담당자가 각각 선정한 단건 최종 후보 모델을 독립적으로 배포 검증한 뒤, 동일한 기록 형식으로 결과를 비교·통합 관리한다.

---

## 2. 비교 대상

| 구분 | 비교 항목 | 후보 |
| --- | --- | --- |
| 대상 모델 | 배포 후보 모델 | RGB-only 최종 후보 / Thermal-only 최종 후보 |
| 모델 형식 | 추론 모델 포맷 | PyTorch FP32 / ONNX FP32 / ONNX INT8 |
| 추론 환경 | 실행 방식 | PyTorch 직접 추론 / ONNX Runtime CPU |
| 최적화 방식 | 양자화 여부 | FP32 유지 / INT8 양자화 |
| 입력 유형 | 분석 입력 | RGB 단일 / Thermal 단일 |
| 입력 해상도 | 모델 입력 크기 | RGB-only / Thermal-only 실험에서 최종 선정된 해상도 |
| Batch size | 추론 단위 | batch size 1 기준 |

본 실험은 학습 성능 비교가 아니라, 최종 후보 단건 모델이 실제 서비스 환경에서 안정적으로 변환·추론·저장 가능한지 확인하는 배포 검증 실험이다.

배포 최적화 실험의 batch size 1은 학습 batch size가 아니라 서비스 단건 추론 기준이다. RGB/Thermal 모델 학습에서 사용하는 batch size 16과 별도로 관리한다.

배포 최적화 실험은 RGB-only 최종 후보 모델과 Thermal-only 최종 후보 모델을 각각 독립적으로 수행한다.

두 모델의 학습 담당자가 다르므로 실험 ID는 `DEP-EXP-01-RGB` , `DEP-EXP-01-THERMAL`처럼 대상 모델 suffix를 붙여 기록한다.

RGB-Thermal Fusion 모델은 아직 최종 후보가 없으므로 본 실험 범위에서 제외한다.

INT8 양자화는 필수 배포 조건이 아니라, ONNX FP32 기준 추론 시간이 부족하거나 모델 크기 최적화가 필요한 경우에만 비교한다.

---

## 3. 공통 실험 조건

| 항목 | 기본 config |
| --- | --- |
| 대상 모델 | RGB-only / Thermal-only 최종 후보 모델 |
| 기준 모델 형식 | PyTorch FP32 |
| 기본 변환 형식 | ONNX FP32 |
| 선택 변환 형식 | ONNX INT8 |
| 추론 엔진 | ONNX Runtime CPU |
| 추론 batch size | 1 |
| 학습 batch size | RGB-only / Thermal-only 학습 실험에서 사용한 batch size를 기록하되, 배포 추론 기준에는 포함하지 않음 |
| 입력 해상도 | RGB-only / Thermal-only 실험에서 최종 선정된 해상도 |
| 입력 유형 | RGB 단일 / Thermal 단일 |
| RGB 출력 결과 | mask, bbox, class, confidence |
| Thermal 출력 결과 | bbox, class, confidence |
| Calibration dataset | RGB-only / Thermal-only validation set 일부 사용 |
| 추론 기준 환경 | ONNX Runtime CPU 기준 |
| GPU 참고 환경 | RTX 4060 등 GPU 환경 추론은 선택적으로 측정할 수 있으나 공식 배포 기준에는 포함하지 않음 |
| 비교 기준 | 변환 전후 출력 일치성, 추론 시간, 모델 크기, 정확도 손실, 결과 포맷 정합성 |
| 유지 기준 | INT8 성능 손실이 크면 ONNX FP32를 최종 배포 후보로 유지 |

---

## 4. 비교 실험 설계

본 실험은 RGB-only / Thermal-only 최종 후보 모델을 대상으로 PyTorch 기준 결과를 먼저 확인한 뒤, ONNX FP32 변환과 ONNX Runtime CPU 추론을 우선 검증한다.

INT8 양자화는 ONNX FP32 기준 추론 시간이 부족하거나 모델 크기 최적화가 필요한 경우에만 선택적으로 수행한다.

실험 ID는 공통 실험 번호 뒤에 대상 모델 suffix를 붙여 기록한다.

- RGB-only 모델: `DEP-EXP-01-RGB`
- Thermal-only 모델: `DEP-EXP-01-THERMAL`

| 실험 ID | 비교 변수 | 비교 내용 | 수행 조건 |
| --- | --- | --- | --- |
| DEP-EXP-01-{RGB/THERMAL} | 모델 포맷 변환 | PyTorch FP32 / ONNX FP32 변환 전후 출력 결과 일치성 비교 | RGB-only / Thermal-only 최종 후보 모델, 최종 입력 해상도, batch size 1 |
| DEP-EXP-02-{RGB/THERMAL} | 추론 엔진 | PyTorch 직접 추론 / ONNX Runtime CPU 기준 단건 추론 시간 비교 | ONNX FP32 변환 성공 모델 기준 |
| DEP-EXP-03-{RGB/THERMAL} | 결과 포맷 정합성 | ONNX Runtime 출력이 AI Worker 결과 포맷과 맞는지 확인 | RGB 단일 / Thermal 단일 결과 필드 확인 |
| DEP-EXP-04-{RGB/THERMAL} | 모델 크기 | PyTorch FP32 / ONNX FP32 모델 파일 크기와 배포 부담 비교 | RGB-only / Thermal-only 최종 후보 모델 파일 기준 |
| DEP-EXP-05-{RGB/THERMAL} | INT8 양자화 | ONNX FP32 / ONNX INT8 간 정확도 손실, 추론 시간, 모델 크기 비교 | ONNX FP32 추론 시간이 부족하거나 경량화가 필요한 경우에만 수행 |
| DEP-EXP-06 | 단건 모델별 추론 결과 통합 비교 | RGB-only ONNX Runtime CPU 추론 결과 / Thermal-only ONNX Runtime CPU 추론 결과 비교 | RGB-only / Thermal-only 배포 검증 완료 후 통합 기록 |

---

## 5. 평가 지표 및 선정 기준

### 5.1 핵심 평가 지표

| 지표 | 의미 | 사용 목적 |
| --- | --- | --- |
| ONNX 변환 성공 여부 | PyTorch FP32 모델이 ONNX FP32로 변환되는지 확인 | 배포 가능성 1차 판단 |
| 출력 일치성 | PyTorch FP32와 ONNX FP32의 bbox, mask, class, confidence 결과 차이 확인 | 변환 후 결과 신뢰성 확인 |
| CPU latency | ONNX Runtime CPU 기준 이미지 1장 추론 시간 | 서비스 단건 분석 속도 확인 |
| 결과 포맷 정합성 | ONNX 출력이 AI Worker 결과 포맷에 맞는지 확인 | 백엔드 저장·시각화 연동 가능성 확인 |
| 모델 파일 크기 | PyTorch, ONNX FP32, ONNX INT8 모델 파일 크기 | 배포 부담 확인 |
| 정확도 손실 | ONNX FP32 또는 ONNX INT8 변환 후 성능 저하 | 최적화 적용 가능성 판단 |

---

### 5.2 보조 평가 지표

| 지표 | 의미 | 사용 조건 |
| --- | --- | --- |
| PyTorch latency | PyTorch 직접 추론 기준 시간 | ONNX Runtime CPU와 비교할 때 사용 |
| FPS | 초당 처리 가능한 이미지 수 | 대량 처리 성능 참고 |
| peak memory | 추론 중 메모리 사용량 | 로컬 또는 서버 사양 검토 시 확인 |
| 출력 안정성 | 동일 입력 반복 추론 시 결과가 안정적인지 확인 | 변환 후 불안정한 출력이 의심될 때 확인 |
| 시각화 overlay 품질 | bbox, mask overlay가 해석 가능한지 확인 | 결과 저장·화면 표시 검수 시 확인 |
| INT8 모델 크기 감소율 | ONNX FP32 대비 INT8 파일 크기 감소 정도 | 경량화 효과 판단 시 확인 |
| INT8 latency 개선율 | ONNX FP32 대비 INT8 CPU 추론 시간 개선 정도 | INT8 적용 여부 판단 시 확인 |
| GPU 참고 latency | RTX 4060 등 GPU 환경에서의 추론 시간 | 공식 배포 기준이 아니라 참고 결과로만 사용 |

---

### 5.3 실험별 우선 지표

| 실험 ID | 핵심 지표 | 보조 지표 | 선정 기준 |
| --- | --- | --- | --- |
| DEP-EXP-01-{RGB/THERMAL} | ONNX 변환 성공 여부, 출력 일치성 | 변환 로그, 샘플 overlay | ONNX FP32 변환이 성공하고 PyTorch 결과와 큰 차이가 없으면 채택 |
| DEP-EXP-02-{RGB/THERMAL} | CPU latency, 추론 성공 여부 | PyTorch latency, FPS, GPU 참고 latency | ONNX Runtime CPU 추론이 성공하고 서비스 적용 가능한 속도이면 채택 |
| DEP-EXP-03-{RGB/THERMAL} | 결과 포맷 정합성 | 출력 안정성, overlay 품질 | RGB는 mask, bbox, class, confidence가 맞고 Thermal은 bbox, class, confidence가 맞으면 채택 |
| DEP-EXP-04-{RGB/THERMAL} | 모델 파일 크기 | 배포 패키지 크기 | 모델 크기가 배포 부담 범위에 있으면 채택 |
| DEP-EXP-05-{RGB/THERMAL} | 정확도 손실, CPU latency, 모델 파일 크기 | INT8 크기 감소율, INT8 latency 개선율 | INT8 적용 후 정확도 손실이 작고 추론 시간 또는 모델 크기 이점이 있으면 채택 |
| DEP-EXP-06 | 입력 유형별 CPU latency, 결과 안정성 | 입력 유형별 실패 케이스 | RGB-only와 Thermal-only가 동일한 기록 기준에서 안정적으로 추론되면 채택 |

---

### 5.4 최종 배포 후보 선정 기준

| 판단 항목 | 기준 |
| --- | --- |
| 1순위 | ONNX FP32 변환과 ONNX Runtime CPU 추론이 안정적으로 성공하는 모델 |
| 2순위 | PyTorch FP32 대비 ONNX FP32 출력 차이가 작고 결과 포맷이 맞는 모델 |
| 3순위 | CPU latency가 서비스 단건 분석 흐름에 적용 가능한 모델 |
| 4순위 | 모델 파일 크기와 배포 부담이 크지 않은 모델 |
| 5순위 | INT8 양자화 적용 시 정확도 손실이 작고 추론 시간 또는 파일 크기 이점이 있는 모델 |
| 최종 선택 | 정확도, 추론 속도, 모델 크기, 결과 포맷 정합성, 배포 안정성을 종합해 단건 모델 최종 배포 형식 선정 |

---

### 5.5 판정 기준

| 판정 | 기준 |
| --- | --- |
| 채택 | 변환·추론·결과 포맷이 안정적이고 다음 배포 단계에 사용할 수 있는 경우 |
| 보류 | 변환 또는 추론은 가능하지만 정확도 손실, latency, 결과 포맷, 모델 크기 문제가 있어 추가 보정이 필요한 경우 |
| 제외 | 변환 실패, 추론 실패, 출력 불일치, 정확도 손실 과다, 결과 포맷 불일치로 배포 후보로 부적합한 경우 |

---

## 6. 실험별 결과 기록 기준

각 실험은 실험 ID 기준으로 결과를 저장하고, 동일한 기록 항목을 사용한다.

| 기록 항목 | 설명 |
| --- | --- |
| 실험 ID | DEP-EXP-01-RGB, DEP-EXP-01-THERMAL처럼 대상 모델 suffix를 포함 |
| 담당자 | 해당 모델의 학습·배포 검증 담당자 |
| 대상 모델 suffix | RGB / THERMAL 중 하나로 기록 |
| 비교 대상 | 해당 실험에서 비교한 모델 형식, 추론 엔진, 입력 유형, 양자화 조건 |
| 대상 모델 | RGB-only / Thermal-only 중 어떤 최종 후보 모델인지 기록 |
| 고정 조건 | 실험 중 변경하지 않은 config |
| 입력 해상도 | 해당 모델의 최종 선정 입력 해상도 |
| 학습 batch size | 해당 모델 학습 실험에서 사용한 batch size |
| 추론 batch size | 1 기준 |
| 핵심 지표 | 최종 판단에 우선 사용하는 지표 |
| 보조 지표 | 판단 보조에 사용하는 지표 |
| 결과 및 계산 기준 | 동일 입력 샘플 또는 validation 일부에서 지표를 계산한 기준 |
| 최종 선택 | 실험 결과에 따라 선택한 모델 형식 또는 배포 방식 |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | PyTorch 모델 파일, ONNX 파일, INT8 모델 파일, 변환 로그, 추론 로그, latency 측정 결과, metric 결과, overlay 이미지 |
| 메모 | 결과 해석, 문제점, 다음 조치 |

### DEP-EXP-01-{RGB/THERMAL}. ONNX 변환 검증

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | ONNX FP32 변환 검증 |
| 비교 대상 | PyTorch FP32 / ONNX FP32 |
| 담당자 |  |
| 대상 모델 suffix | RGB / THERMAL |
| 대상 모델 | RGB-only / Thermal-only 최종 후보 모델 |
| 고정 조건 | 최종 후보 모델, 최종 입력 해상도, 추론 batch size 1 |
| 입력 해상도 | 각 모델 최종 선정 해상도 |
| 학습 batch size | 해당 모델 학습 실험 기준 |
| 추론 batch size | 1 |
| 핵심 지표 | ONNX 변환 성공 여부, 출력 일치성 |
| 보조 지표 | 변환 로그, 샘플 overlay 품질 |
| 결과 및 계산 기준 | 동일 입력에서 PyTorch FP32와 ONNX FP32의 bbox, mask, class, confidence 결과 차이 확인 |
| 최종 선택 |  |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | PyTorch 모델 파일, ONNX FP32 파일, 변환 로그, 출력 비교 결과, overlay 이미지 |
| 메모 |  |

### DEP-EXP-02-{RGB/THERMAL}. ONNX Runtime CPU 추론

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | ONNX Runtime CPU 추론 |
| 비교 대상 | PyTorch 직접 추론 / ONNX Runtime CPU |
| 담당자 |  |
| 대상 모델 suffix | RGB / THERMAL |
| 대상 모델 | RGB-only / Thermal-only 최종 후보 모델 |
| 고정 조건 | ONNX FP32 변환 성공 모델, 추론 batch size 1 |
| 입력 해상도 | 각 모델 최종 선정 해상도 |
| 학습 batch size | 해당 모델 학습 실험 기준 |
| 추론 batch size | 1 |
| 핵심 지표 | CPU latency, 추론 성공 여부 |
| 보조 지표 | PyTorch latency, FPS, peak memory, GPU 참고 latency |
| 결과 및 계산 기준 | 동일 입력 샘플 기준 PyTorch 직접 추론과 ONNX Runtime CPU 추론 시간을 비교하고, GPU 추론 시간은 참고 결과로만 기록 |
| 최종 선택 |  |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | latency 측정 결과, 추론 로그, CPU 환경 정보, GPU 참고 환경 정보, 샘플 예측 결과 |
| 메모 |  |

### DEP-EXP-03-{RGB/THERMAL}. 결과 포맷 정합성 검증

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | AI Worker 결과 포맷 정합성 검증 |
| 비교 대상 | ONNX Runtime 출력 / AI Worker 결과 포맷 |
| 담당자 |  |
| 대상 모델 suffix | RGB / THERMAL |
| 대상 모델 | RGB-only / Thermal-only 최종 후보 모델 |
| 고정 조건 | ONNX FP32 변환 성공 모델, 추론 batch size 1 |
| 입력 해상도 | 각 모델 최종 선정 해상도 |
| 학습 batch size | 해당 모델 학습 실험 기준 |
| 추론 batch size | 1 |
| 핵심 지표 | 결과 포맷 정합성 |
| 보조 지표 | 출력 안정성, overlay 품질 |
| 결과 및 계산 기준 | RGB는 mask, bbox, class, confidence를 확인하고 Thermal은 bbox, class, confidence를 확인 |
| 최종 선택 |  |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | 결과 JSON 샘플, overlay 이미지, 포맷 검증 로그 |
| 메모 |  |

### DEP-EXP-04-{RGB/THERMAL}. 모델 크기 비교

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | 모델 크기 비교 |
| 비교 대상 | PyTorch FP32 / ONNX FP32 |
| 담당자 |  |
| 대상 모델 suffix | RGB / THERMAL |
| 대상 모델 | RGB-only / Thermal-only 최종 후보 모델 |
| 고정 조건 | 최종 후보 모델 파일 |
| 입력 해상도 | 각 모델 최종 선정 해상도 |
| 학습 batch size | 해당 모델 학습 실험 기준 |
| 추론 batch size | 해당 없음 |
| 핵심 지표 | 모델 파일 크기 |
| 보조 지표 | 배포 패키지 크기 |
| 결과 및 계산 기준 | PyTorch FP32와 ONNX FP32 모델 파일 크기 비교 |
| 최종 선택 |  |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | 모델 파일 크기 표, 모델 파일 경로 |
| 메모 |  |

### DEP-EXP-05-{RGB/THERMAL}. INT8 양자화 비교

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | INT8 양자화 비교 |
| 비교 대상 | ONNX FP32 / ONNX INT8 |
| 담당자 |  |
| 대상 모델 suffix | RGB / THERMAL |
| 대상 모델 | RGB-only / Thermal-only 최종 후보 모델 |
| 고정 조건 | ONNX FP32 변환 성공 모델, calibration dataset, 추론 batch size 1 |
| 입력 해상도 | 각 모델 최종 선정 해상도 |
| 학습 batch size | 해당 모델 학습 실험 기준 |
| 추론 batch size | 1 |
| 핵심 지표 | 정확도 손실, CPU latency, 모델 파일 크기 |
| 보조 지표 | INT8 크기 감소율, INT8 latency 개선율 |
| 결과 및 계산 기준 | ONNX FP32 대비 ONNX INT8의 mAP, Precision, Recall, F1-score 감소폭과 추론 시간·모델 크기 개선 여부 비교 |
| 최종 선택 |  |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | ONNX FP32 파일, ONNX INT8 파일, calibration 설정, accuracy 비교표, latency 측정 결과, 모델 크기 표 |
| 메모 | INT8 정확도 손실이 크면 ONNX FP32 유지 |

### DEP-EXP-06. 단건 모델별 추론 결과 통합 비교

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | 단건 모델별 추론 결과 통합 비교 |
| 비교 대상 | RGB-only ONNX Runtime CPU 추론 결과 / Thermal-only ONNX Runtime CPU 추론 결과 |
| 담당자 | RGB 담당자 / Thermal 담당자 |
| 대상 모델 suffix | RGB / THERMAL |
| 대상 모델 | RGB-only / Thermal-only 최종 후보 모델 |
| 고정 조건 | 각 입력 유형별 최종 후보 모델, 추론 batch size 1 |
| 입력 해상도 | 각 모델 최종 선정 해상도 |
| 학습 batch size | 각 모델 학습 실험 기준 |
| 추론 batch size | 1 |
| 핵심 지표 | 입력 유형별 CPU latency, 결과 안정성 |
| 보조 지표 | 입력 유형별 실패 케이스 수, overlay 품질, GPU 참고 latency |
| 결과 및 계산 기준 | RGB-only와 Thermal-only의 ONNX Runtime CPU 추론 결과를 같은 기록 형식으로 비교하고, GPU 결과는 참고 결과로만 기록 |
| 최종 선택 |  |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | 입력 유형별 latency 표, 추론 로그, 결과 JSON 샘플, overlay 이미지 |
| 메모 | Fusion 모델은 Fusion 실험 완료 후 별도 배포 최적화 대상으로 추가 |

---

## 7. 후속 실험

기본 최적화 실험에서 추론 시간이 부족하거나 INT8 정확도 손실이 큰 경우에만 제한적으로 수행

| 구분 | 후속 비교 항목 | 수행 조건 |
| --- | --- | --- |
| Quantization 방식 | Dynamic quantization / Static quantization | INT8 적용 필요성이 있고 기본 INT8 결과가 불안정한 경우 |
| 모델 경량화 | YOLO26n 재검토 / pruning / distillation | CPU latency가 서비스 기준을 넘거나 모델 크기가 큰 경우 |
| 추론 환경 | CPU thread 수 조정 / 추론 batch size 1 고정 | ONNX Runtime CPU 추론 시간이 불안정한 경우 |
| GPU 참고 추론 | RTX 4060 환경에서 PyTorch CUDA 또는 ONNX Runtime GPU 추론 시간 참고 측정 | 공식 배포 기준에는 포함하지 않고 참고 결과로만 기록 |
| 입력 해상도 | 성능 손실을 감수한 입력 해상도 축소 | 최종 모델의 latency가 과도하게 큰 경우 |
| 배포 구조 | AI Worker instance 분리 / 비동기 queue 처리 강화 | 모델 최적화만으로 처리 시간이 부족한 경우 |
| Fusion 배포 확장 | RGB-Thermal Fusion 최종 후보 모델의 ONNX 변환과 pair 입력 추론 검증 | Fusion 실험 완료 후 최종 후보가 선정된 경우에만 수행 |

## Synthetic Defect 생성 및 라벨링

## 1. 목적

RGB-only / Thermal-only 단건 baseline 확보 이후, 실제 RGB-Thermal 결함 pair 데이터가 부족한 문제를 보완하기 위해 **O&M RGB-Thermal 정상 pair** 위에 RGB 결함과 Thermal 결함을 합성하여 **Fusion 후속 실험용 synthetic paired dataset**을 생성한다.

합성 결과는 학습과 후속 검증에 사용할 수 있도록 단순한 라벨 체계로 관리한다.

---

## 2. Fusion pair 데이터 현황

기호 기준

```
O  : 현재 데이터로 사용 가능
△  : 사용 가능하지만 보정 또는 추가 확인 필요
X  : 현재 부족하여 추가 탐색 필요
```

| Pair 생성 대상 | RGB source | Thermal source | 판단 | 처리 방향 |
| --- | --- | --- | --- | --- |
| Normal | O | O | O | O&M 정상 pair 사용 |
| Bird-drop | O | X | △ | Thermal bird-drop 또는 weak hotspot source 추가 탐색 |
| Dust / Soiling | O | △ | △ | Thermal soiling / uneven heating source 보강 |
| Snow | O | X | △ | Thermal cold response source 추가 탐색 |
| Shading | O | O~△ | O~△ | Thermal substring / diode / uneven heating과 연결 |
| Hotspot | △ | O | O~△ | RGB burn mark / black spot source 보강 |
| Diode / Electrical | O | O | O | RGB electrical damage와 Thermal diode 연결 |
| String / Substring | X~△ | O | △ | RGB counterpart 부족 시 normal RGB 또는 electrical trace로 처리 |
| Physical damage | O | △ | △ | Thermal normal 또는 weak hotspot으로 처리 |
| Low-quality | △ | △ | △ | 흐림, 반사, saturation, mismatch는 후순위 관리 |

---

## 3. 사용할 도구

| 도구 | 사용 목적 |
| --- | --- |
| Roboflow 또는 CVAT | 결함 영역 bbox / polygon 라벨링 |
| YOLO26-seg | 패널/배열 crop 자동화, 결함 source 자동 추출 |
| Python + OpenCV | 결함 위치·크기·각도 맞춤, RGB/Thermal 합성 |
| Diffusion / Inpainting 모델 | Rule-based 합성 품질이 부족한 경우 경계·질감 보정 후보로 검토 |
| Anomalib | 합성 데이터 품질 검증 |

---

## 4. 만들 데이터

| 데이터 | 내용 |
| --- | --- |
| 정상 crop pair | O&M RGB-Thermal 정상 pair에서 패널/배열 crop 생성 |
| RGB 결함 source | bird-drop, snow, dust, shading, electrical damage, broken 등 |
| Thermal 결함 source | hotspot, diode, substring, string fault, uneven heating 등 |
| synthetic pair | 정상 RGB/Thermal crop 위에 결함을 같은 위치 기준으로 합성한 pair 데이터 |
| 자동 라벨 | bbox, mask, fusion_class, pair_type, severity |

---

## 5. 작업 방식

```
1. Roboflow 또는 CVAT으로 일부 이미지 수동 라벨링
2. YOLO26-seg로 패널/배열 crop과 결함 source 추출
3. O&M 정상 RGB-Thermal crop pair 생성
4. RGB 결함과 Thermal 결함을 같은 위치·크기·각도 기준으로 합성
5. 1차 기준은 Python + OpenCV 기반 rule-based 합성으로 생성
6. 합성 경계와 질감 품질이 부족한 경우 Diffusion / Inpainting 보정을 후속 후보로 검토
7. bbox, mask, fusion_class, pair_type, severity 자동 생성
8. Anomalib과 샘플 검수로 사용 가능 여부 판단
```

---

## 6. 초기 수동 라벨링 기준

초기에는 많은 양을 일괄 라벨링하기보다, 자동화 가능성과 합성 파이프라인 검증이 가능한 수준으로 제한해 진행한다.

| 대상 | 기준 |
| --- | --- |
| O&M RGB panel / array | 50~100장 |
| O&M Thermal panel / array | 50~100장 |
| RGB 결함 source | 결함 유형별 20~50개 |
| Thermal 결함 source | 결함 유형별 20~50개 |

이미 bbox, mask가 있는 공개 데이터셋은 새로 라벨링하지 않는다.

자동 추출이 부정확한 샘플만 수동 보정한다.

---

## 7. 결함 라벨링 기준

기존 세부 결함 class는 source metadata로 보관하고, Fusion 학습용 라벨은 단순화된 `fusion_class` 기준으로 관리한다.

| fusion_class | 포함 결함 |
| --- | --- |
| NORMAL | 정상 |
| SURFACE_COVERAGE_DEFECT | bird-drop, snow, dust, soiling, shading |
| ELECTRICAL_THERMAL_DEFECT | hotspot, diode, substring, string fault, electrical damage |
| PHYSICAL_DAMAGE_DEFECT | broken, crack, missing, physical damage |
| LOW_QUALITY | 흐림, 반사, crop 불량, RGB-Thermal 위치 불일치 |

예시

```
rgb_source_class = bird-drop
thermal_source_class = weak hotspot
fusion_class = SURFACE_COVERAGE_DEFECT

rgb_source_class = shading
thermal_source_class = substring
fusion_class = SURFACE_COVERAGE_DEFECT

rgb_source_class = electrical-damage
thermal_source_class = diode
fusion_class = ELECTRICAL_THERMAL_DEFECT
```

---

## 8. pair_type 기준

| pair_type | 의미 |
| --- | --- |
| NORMAL_NORMAL | RGB와 Thermal 모두 정상 |
| RGB_ONLY_DEFECT | RGB에만 결함 있음 |
| THERMAL_ONLY_DEFECT | Thermal에만 이상 있음 |
| CORRELATED_DEFECT | RGB 결함과 Thermal 이상이 같은 위치에 있음 |
| MISMATCH_DEFECT | RGB 결함과 Thermal 이상 위치가 다름 |
| LOW_QUALITY_PAIR | 정합 불량 또는 품질 문제 |

---

## 9. 문서 적용 범위

본 문서는 **RGB-only / Thermal-only 단건 baseline 확보 이후 수행하는 Fusion 후속 데이터 생성 단계**를 대상으로 한다.

현재 1차 범위는 단건 RGB/Thermal baseline 구축과 단건 모델 배포 검증이며, 본 synthetic paired dataset 생성은 그 이후 단계에서 수행한다.

## Anomalib 품질 검증

## 1. 목적

Synthetic Defect 생성 단계에서 만든 RGB-Thermal synthetic pair가 Fusion 후속 실험에 사용할 수 있는 품질인지 검증한다.

Anomalib은 라벨을 새로 만드는 용도가 아니라, 합성된 결함이 정상 crop 대비 이상 영역으로 잘 드러나는지 확인하는 보조 검증 도구로 사용한다.

검증 결과는 synthetic sample을 **사용 / 보류 / 제외**로 분류하는 기준으로 활용한다.

본 검증은 RGB-only / Thermal-only 단건 baseline 확보 이후, Fusion 후속 실험용 synthetic paired dataset 생성 단계에서 수행한다.

---

## 2. 검증 대상

| 구분 | 입력 데이터 | 검증 내용 |
| --- | --- | --- |
| RGB 검증 | 정상 RGB crop, synthetic RGB crop | RGB 결함이 anomaly heatmap에서 반응하는지 확인 |
| Thermal 검증 | 정상 Thermal crop, synthetic Thermal crop | Thermal 발열 이상이 anomaly heatmap에서 반응하는지 확인 |
| Pair 검증 | synthetic RGB-Thermal pair | RGB/Thermal 결함 위치와 pair_type이 의도와 맞는지 확인 |
| Normal 검증 | 정상 RGB crop, 정상 Thermal crop | 정상 crop에서 오탐 반응이 과도하지 않은지 확인 |

RGB synthetic crop은 generator mask/bbox와 anomaly heatmap을 비교한다.

Thermal synthetic crop은 generator bbox와 anomaly heatmap의 주요 반응 영역을 비교한다.

---

## 3. 검증 방식

```
1. 정상 RGB crop으로 RGB Anomalib 기준 생성
2. 정상 Thermal crop으로 Thermal Anomalib 기준 생성
3. synthetic RGB crop 검증
4. synthetic Thermal crop 검증
5. RGB는 generator mask/bbox와 anomaly heatmap 비교
6. Thermal은 generator bbox와 anomaly heatmap 주요 반응 영역 비교
7. synthetic RGB-Thermal pair의 위치, pair_type, fusion_class 정합성 확인
8. 샘플 검수
9. 사용 / 보류 / 제외 판단
```

Anomalib 결과만으로 최종 라벨을 수정하지 않는다.

최종 라벨은 Synthetic Defect 생성 단계에서 만든 `bbox`, `mask`, `fusion_class`, `pair_type`, `severity`를 기준으로 한다.

다만 Anomalib 검증 결과는 sample의 사용 가능성 판단과 제외 사유 기록에 활용한다.

---

## 4. 실험 설계

| 실험 ID | 실험명 | 내용 |
| --- | --- | --- |
| ANO-EXP-01 | RGB 합성 품질 검증 | RGB synthetic crop의 anomaly heatmap과 generator mask/bbox 비교 |
| ANO-EXP-02 | Thermal 합성 품질 검증 | Thermal synthetic crop의 anomaly heatmap과 generator bbox 비교 |
| ANO-EXP-03 | 정상 crop 오탐 검증 | 정상 RGB/Thermal crop에서 anomaly score가 과도하게 높지 않은지 확인 |
| ANO-EXP-04 | Pair sample 검증 | RGB와 Thermal 결함 위치, 크기, pair_type, fusion_class 정합성 확인 |
| ANO-EXP-05 | 제외 기준 정리 | 합성 티, 위치 불일치, heatmap 무반응 샘플을 제외 기준으로 정리 |

---

## 5. 평가 기준

| 평가 항목 | 기준 |
| --- | --- |
| RGB Mask-Heatmap 일치도 | RGB synthetic crop에서 anomaly heatmap 주요 반응이 generator mask와 겹치는지 확인 |
| RGB BBox 포함 여부 | RGB anomaly heatmap 주요 반응이 generator bbox 내부에 포함되는지 확인 |
| Thermal BBox-Heatmap 일치도 | Thermal synthetic crop에서 anomaly heatmap 주요 반응이 generator bbox 내부에 포함되는지 확인 |
| Anomaly score | synthetic crop이 정상 crop보다 충분히 높은 score를 가지는지 확인 |
| 정상 오탐 여부 | 정상 crop에서 과도한 anomaly 반응이 발생하지 않는지 확인 |
| Pair 정합성 | RGB 결함과 Thermal 결함이 pair_type 의도와 맞는지 확인 |
| fusion_class 정합성 | RGB source class, Thermal source class, fusion_class 매핑이 의도와 맞는지 확인 |
| 합성 현실감 | 붙여넣기 경계, 질감, thermal 형식 차이가 과도하지 않은지 확인 |
| 사용 가능성 | sample을 사용 / 보류 / 제외 중 하나로 분류 |

---

## 6. 판단 기준

| 상태 | 기준 |
| --- | --- |
| 사용 | mask/bbox와 heatmap 반응이 대체로 일치하고, 합성 결과가 시각적으로 자연스러우며 pair_type과 fusion_class가 의도와 맞는 경우 |
| 보류 | anomaly 반응은 있으나 위치, 질감, thermal 형식 차이, pair 정합성, class 매핑이 애매한 경우 |
| 제외 | heatmap 반응이 거의 없거나, 합성 티가 심하거나, RGB-Thermal 위치가 맞지 않거나, pair_type과 fusion_class가 명확히 어긋나는 경우 |

---

## 7. 실험별 기록 기준

각 검증 결과는 실험 ID 기준으로 기록한다.

| 기록 항목 | 설명 |
| --- | --- |
| 실험 ID | ANO-EXP-01 ~ ANO-EXP-05 |
| 담당자 | 품질 검증 담당자 |
| 검증 대상 | RGB synthetic crop / Thermal synthetic crop / Pair sample / Normal crop |
| 고정 조건 | Anomalib 모델, 정상 crop 기준 데이터, 입력 크기, threshold 조건 |
| Seed | 실험 재현성을 위해 사용한 seed 값 |
| 핵심 지표 | 최종 판단에 우선 사용하는 지표 |
| 보조 지표 | 판단 보조에 사용하는 지표 |
| 결과 및 계산 기준 | anomaly score, heatmap, generator mask/bbox 비교 기준 |
| 판정 | 사용 / 보류 / 제외 |
| 산출물 | anomaly heatmap, mask/bbox compare overlay, quality_result.csv, review sample |
| 메모 | 제외 사유, 보류 사유, 다음 조치 |

---

## 8. 실험별 결과 템플릿

### ANO-EXP-01. RGB 합성 품질 검증

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | RGB synthetic crop 품질 검증 |
| 담당자 |  |
| 검증 대상 | synthetic RGB crop |
| 고정 조건 | 정상 RGB crop 기준 Anomalib memory bank, 동일 입력 크기 |
| Seed | 42 |
| 핵심 지표 | RGB Mask-Heatmap 일치도, RGB BBox 포함 여부, anomaly score |
| 보조 지표 | 합성 현실감, 정상 오탐 여부 |
| 결과 및 계산 기준 | RGB anomaly heatmap과 generator mask/bbox overlay 비교 |
| 판정 | 사용 / 보류 / 제외 |
| 산출물 | RGB anomaly heatmap, RGB mask/bbox compare overlay, quality_result.csv |
| 메모 |  |

### ANO-EXP-02. Thermal 합성 품질 검증

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Thermal synthetic crop 품질 검증 |
| 담당자 |  |
| 검증 대상 | synthetic Thermal crop |
| 고정 조건 | 정상 Thermal crop 기준 Anomalib memory bank, 동일 입력 크기 |
| Seed | 42 |
| 핵심 지표 | Thermal BBox-Heatmap 일치도, anomaly score |
| 보조 지표 | 발열 패턴 현실감, 정상 오탐 여부 |
| 결과 및 계산 기준 | Thermal anomaly heatmap과 generator bbox overlay 비교 |
| 판정 | 사용 / 보류 / 제외 |
| 산출물 | Thermal anomaly heatmap, Thermal bbox compare overlay, quality_result.csv |
| 메모 |  |

### ANO-EXP-03. 정상 crop 오탐 검증

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Normal crop 오탐 검증 |
| 담당자 |  |
| 검증 대상 | 정상 RGB crop / 정상 Thermal crop |
| 고정 조건 | 정상 crop 기준 Anomalib memory bank |
| Seed | 42 |
| 핵심 지표 | 정상 crop anomaly score, 정상 오탐 여부 |
| 보조 지표 | 정상 crop heatmap 반응 위치 |
| 결과 및 계산 기준 | 정상 crop에서 anomaly score가 과도하게 높거나 특정 위치에 과반응하는지 확인 |
| 판정 | 사용 / 보류 / 제외 |
| 산출물 | normal heatmap, normal score table |
| 메모 |  |

### ANO-EXP-04. Pair sample 검증

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | synthetic RGB-Thermal pair 품질 검증 |
| 담당자 |  |
| 검증 대상 | synthetic RGB-Thermal pair |
| 고정 조건 | 동일 pair 생성 config, 동일 crop 기준 |
| Seed | 42 |
| 핵심 지표 | Pair 정합성, fusion_class 정합성, pair_type 정합성 |
| 보조 지표 | RGB/Thermal 각각의 anomaly score, heatmap 반응 위치 |
| 결과 및 계산 기준 | RGB와 Thermal 결함 위치, 크기, pair_type, fusion_class가 의도와 맞는지 확인 |
| 판정 | 사용 / 보류 / 제외 |
| 산출물 | pair compare overlay, pair quality table, review sample |
| 메모 |  |

### ANO-EXP-05. 제외 기준 정리

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | synthetic sample 제외 기준 정리 |
| 담당자 |  |
| 검증 대상 | 사용 / 보류 / 제외로 분류된 synthetic sample |
| 고정 조건 | ANO-EXP-01 ~ ANO-EXP-04 결과 기준 |
| Seed | 해당 없음 |
| 핵심 지표 | 제외 사유 유형, 제외 비율 |
| 보조 지표 | 보류 사유 유형, 재검수 필요 샘플 수 |
| 결과 및 계산 기준 | 합성 티, heatmap 무반응, bbox/mask 불일치, pair mismatch, class mismatch 기준으로 분류 |
| 판정 | 사용 / 보류 / 제외 기준 확정 |
| 산출물 | quality_result.csv, exclude_reason_summary.csv, review_samples |
| 메모 |  |

---

## 9. 산출물

| 산출물 | 내용 |
| --- | --- |
| anomaly_heatmap | RGB/Thermal synthetic crop별 Anomalib heatmap |
| mask_bbox_compare | generator mask/bbox와 heatmap overlay 비교 이미지 |
| pair_compare_overlay | RGB-Thermal pair의 결함 위치와 heatmap 반응 비교 이미지 |
| quality_result.csv | sample_id, modality, anomaly_score, pair_type, fusion_class, 판정 상태, 제외 사유 |
| exclude_reason_summary.csv | 제외 사유별 sample 수와 비율 |
| review_samples | 사용 / 보류 / 제외 샘플 예시 이미지 |

---

## 10. 문서 적용 범위

본 문서는 **Synthetic Defect 생성 및 라벨링 이후 수행하는 Fusion 후속 데이터 품질 검증 단계**를 대상으로 한다.

현재 1차 범위는 RGB-only / Thermal-only 단건 baseline 구축과 단건 모델 배포 검증이며, 본 Anomalib 품질 검증은 Fusion 후속 실험용 synthetic paired dataset 생성 이후 수행한다.

## RGB-Thermal Fusion 후속 실험

## 1. 목적

RGB-only, Thermal-only 단건 baseline과 단건 모델 배포 검증이 완료된 이후, RGB-Thermal pair 입력이 단건 모델보다 이상 후보 선별에 도움이 되는지 검증한다.

Fusion은 초기 단건 모델을 대체하는 것이 아니라, RGB와 Thermal이 함께 있는 경우 더 정확한 판단을 제공하기 위한 후속 고도화 실험으로 진행한다.

본 실험은 RGB-only / Thermal-only 단건 모델이 안정적으로 확보된 뒤 수행하며, 현재 1차 범위인 단건 baseline 구축과 단건 모델 배포 최적화 이후 단계로 둔다.

---

## 2. 실험 전제

| 항목 | 기준 |
| --- | --- |
| RGB 단건 모델 | YOLO26 RGB-only baseline 확보 |
| Thermal 단건 모델 | YOLO26 Thermal-only baseline 확보 |
| 단건 배포 검증 | RGB-only / Thermal-only 모델의 ONNX 변환, ONNX Runtime CPU 추론, 결과 포맷 정합성 확인 |
| Pair 데이터 | O&M 정상 pair 기반 synthetic RGB-Thermal paired dataset 사용 |
| Synthetic 품질 검증 | Anomalib 및 샘플 검수 기준으로 사용 / 보류 / 제외 판정 완료 |
| 라벨 | bbox, mask, fusion_class, pair_type, severity |
| 비교 기준 | RGB-only / Thermal-only / Fusion 동일 test split 또는 동일 평가 기준 비교 |
| 배포 기준 | Fusion 최종 후보가 선정된 이후 ONNX 변환 및 CPU 추론 가능성 확인 |

---

## 3. 비교 대상

| 구분 | 후보 |
| --- | --- |
| 입력 구성 | RGB-only / Thermal-only / RGB-Thermal pair |
| Fusion 방식 | Late Fusion 우선, Early Fusion은 후순위 후보 |
| 모델 | Late Fusion은 YOLO26 RGB-only / YOLO26 Thermal-only 결과 결합 기준, Early Fusion은 후순위 학습 후보 |
| 입력 단위 | Panel crop pair 우선, 필요 시 Array crop pair 검토 |
| 입력 해상도 | 단건 baseline에서 선정한 입력 해상도 기준, 640×640 우선 |
| 후처리 | confidence threshold, NMS IoU, weighted score fusion, severity rule |

본 실험의 1차 Fusion 방식은 Late Fusion이다.

Early Fusion은 pair 데이터 품질, 입력 구조, 학습 안정성, ONNX 변환 가능성이 확인된 이후 후순위로 검토한다.

---

## 4. 기본 조건

| 항목 | 내용 |
| --- | --- |
| 기본 데이터셋 | synthetic RGB-Thermal paired dataset |
| 생성 기준 | O&M 정상 crop pair + RGB/Thermal 결함 source 합성 |
| 기본 Fusion 방식 | Late Fusion |
| Early Fusion | 입력 구조와 ONNX 변환 안정성 확인 후 후순위 검토 |
| 학습 단위 | Panel crop pair 우선 |
| 모델/후처리 출력 | bbox, mask, fusion_class, confidence, severity |
| 서비스 후처리 후보 | action candidate |
| pair_type | NORMAL_NORMAL, RGB_ONLY_DEFECT, THERMAL_ONLY_DEFECT, CORRELATED_DEFECT, MISMATCH_DEFECT, LOW_QUALITY_PAIR |
| 비교 조건 | 단건 모델과 Fusion 모델은 동일 test split 또는 동일 평가 기준으로 비교 |
| 추론 기준 | 단건 RGB 모델 + 단건 Thermal 모델 + Fusion 후처리 시간을 함께 확인 |
| 배포 기준 | Fusion 최종 후보가 선정된 경우에만 별도 배포 최적화 실험으로 확장 |

---

## 5. 실험 항목

본 실험은 모든 Fusion 방식을 한 번에 비교하지 않고, Late Fusion을 우선 검증한 뒤 개선 효과가 부족한 경우에만 Early Fusion을 추가 검토한다.

| 실험 ID | 실험명 | 내용 |
| --- | --- | --- |
| FUS-EXP-01 | 단건 대비 Fusion 비교 | RGB-only, Thermal-only, Late Fusion 결과를 동일 test split 또는 동일 평가 기준에서 비교 |
| FUS-EXP-02 | Late Fusion 방식 비교 | score 결합, NMS, weighted score fusion, severity rule 방식 비교 |
| FUS-EXP-03 | pair_type 영향 확인 | RGB_ONLY_DEFECT, THERMAL_ONLY_DEFECT, CORRELATED_DEFECT, MISMATCH_DEFECT 비율에 따른 성능 변화 확인 |
| FUS-EXP-04 | Pair 정합성 영향 확인 | 정합이 좋은 pair와 위치 오차가 있는 pair의 성능 차이 확인 |
| FUS-EXP-05 | Fusion 배포 가능성 확인 | Fusion 최종 후보가 선정된 이후 ONNX 변환, CPU 추론, 결과 포맷 정합성 확인 |

---

## 6. 평가 지표 및 선정 기준

### 6.1 핵심 평가 지표

| 지표 | 산출 방식 | 산출물 | 사용 목적 |
| --- | --- | --- | --- |
| Fusion 개선 효과 | 동일 test split에서 단건 최고 성능과 Fusion 성능 차이를 계산 | fusion_vs_single_metric.csv | Fusion 적용 필요성 판단 |
| mAP50-95 / mAP50 | bbox 또는 mask 기준 IoU로 평균 정밀도 계산 | metric_result.csv | 단건 모델과 Fusion 결과 비교 |
| class별 Recall | fusion_class별 TP / GT 기준으로 Recall 계산 | class_metric.csv | 미탐이 큰 class 확인 |
| Precision | TP / (TP + FP) 계산 | metric_result.csv | 오탐이 많은지 확인 |
| Recall | TP / (TP + FN) 계산 | metric_result.csv | 전체 미탐 확인 |
| F1-score | Precision과 Recall의 조화 평균 계산 | metric_result.csv | threshold와 fusion 방식 비교 |
| 평균 latency | 단건 2개 실행 시간 + Fusion 후처리 시간을 이미지 또는 pair 1건 기준으로 측정 | latency_result.csv | 서비스 적용 가능성 확인 |

---

### 6.2 보조 평가 지표

| 지표 | 산출 방식 | 산출물 | 사용 조건 |
| --- | --- | --- | --- |
| pair_type별 성능 | test set을 pair_type별로 나누고 각 그룹의 Precision, Recall, F1-score를 계산 | pair_type_metric.csv | correlated, mismatch, RGB-only defect, Thermal-only defect별 성능 차이 확인 |
| 정합 오차 영향 | RGB/Thermal 결함 중심점 또는 bbox 중심점 거리 차이를 기준으로 정합 오차 구간을 나누고 구간별 Recall, F1-score를 계산 | alignment_error_metric.csv | 위치 오차가 Fusion 성능에 미치는 영향 확인 |
| 모달 보완 샘플 수 | RGB-only는 미탐이고 Thermal-only 또는 Fusion은 탐지한 샘플 수, Thermal-only는 미탐이고 RGB-only 또는 Fusion은 탐지한 샘플 수를 계산 | modality_complement_cases.csv | Fusion이 단건 모델의 미탐을 보완하는지 확인 |
| Fusion 악화 샘플 수 | RGB-only 또는 Thermal-only는 정답에 가까웠지만 Fusion 결과가 오탐, 미탐, class 오분류로 나빠진 샘플 수를 계산 | fusion_regression_cases.csv | Fusion 적용으로 성능이 나빠지는 위험 확인 |
| 실패 케이스 수 | FP, FN, class mismatch, pair mismatch, low-quality pair 유형별 샘플 수를 계산 | failure_case_summary.csv | 보류 또는 제외 원인 파악 |
| 결과 포맷 정합성 | 결과 JSON에 bbox, mask, fusion_class, confidence, severity, pair_type 필드가 있는지 확인하고 누락/타입 오류 수를 계산 | result_format_check.json 또는 result_format_check.csv | AI Worker, Backend 저장 구조, 화면 시각화 연계 가능성 확인 |
| 모델/후처리 복잡도 | Fusion 후처리 단계 수, 추가 config 수, 추가 실행 시간, 추가 의존성 여부를 기록 | fusion_complexity_report.md | 서비스 적용성과 유지보수 부담 판단 |

---

### 6.3 실험별 우선 지표

| 실험 ID | 핵심 지표 | 보조 지표 | 선정 기준 |
| --- | --- | --- | --- |
| FUS-EXP-01 | Fusion 개선 효과, mAP50-95 / mAP50, class별 Recall | 모달 보완 샘플 수, Fusion 악화 샘플 수, 실패 케이스 수 | 단건 baseline 대비 성능이 개선되고 Fusion 악화 샘플이 과도하지 않으면 채택 |
| FUS-EXP-02 | F1-score, Precision, Recall, 평균 latency | threshold별 score 분포, Fusion 악화 샘플 수, 모델/후처리 복잡도 | 오탐·미탐 균형과 추론 비용이 가장 좋은 Late Fusion 방식 채택 |
| FUS-EXP-03 | pair_type별 Recall, pair_type별 F1-score | pair_type별 실패 케이스 수 | 특정 pair_type에서 Fusion이 불안정하면 보류 또는 제외 |
| FUS-EXP-04 | 정합 오차 구간별 Recall, 정합 오차 구간별 F1-score, 실패 케이스 수 | pair overlay 품질, mismatch sample 수 | 위치 오차에 민감한 경우 pair 품질 기준을 강화 |
| FUS-EXP-05 | ONNX 변환 성공 여부, CPU latency, 결과 포맷 정합성 | 모델 크기, 출력 안정성, 결과 필드 오류 수 | Fusion 최종 후보가 배포 구조에 맞으면 채택 |

---

### 6.4 최종 Fusion 후보 선정 기준

| 판단 항목 | 기준 |
| --- | --- |
| 1순위 | RGB-only / Thermal-only 단건 baseline 대비 이상 후보 선별 성능이 개선되는 방식 |
| 2순위 | class별 Recall이 안정적이고 특정 fusion_class에서 심각한 미탐이 적은 방식 |
| 3순위 | pair_type별 결과가 해석 가능하고 mismatch pair에서 과도한 오판이 적은 방식 |
| 4순위 | 단건 2개 실행 + Fusion 후처리 latency가 서비스 적용 범위에 들어오는 방식 |
| 5순위 | 결과 포맷이 AI Worker, Backend 저장 구조, 화면 시각화와 맞는 방식 |
| 최종 선택 | 성능, 추론 시간, pair 정합성 민감도, 결과 포맷 정합성, 배포 가능성을 종합해 Fusion 후속 후보 선정 |

---

### 6.5 판정 기준

| 판정 | 기준 |
| --- | --- |
| 채택 | 단건 baseline 대비 성능 또는 이상 후보 선별 품질이 개선되고, 추론 시간과 결과 포맷이 서비스 적용 가능 범위에 있는 경우 |
| 보류 | 일부 개선은 있으나 pair_type 편차, 위치 정합성 문제, 추론 시간, 결과 포맷 문제로 추가 확인이 필요한 경우 |
| 제외 | 단건 baseline 대비 개선이 없거나, 특정 pair_type에서 결과가 불안정하거나, 추론 비용과 구현 복잡도가 커서 후속 후보로 부적합한 경우 |

---

## 7. 실험별 결과 기록 기준

각 Fusion 실험은 실험 ID 기준으로 결과를 저장하고, 동일한 기록 항목을 사용한다.

| 기록 항목 | 설명 |
| --- | --- |
| 실험 ID | FUS-EXP-01 ~ FUS-EXP-05 |
| 담당자 | Fusion 실험 담당자 |
| 비교 대상 | 해당 실험에서 비교한 입력 구성, Fusion 방식, threshold, pair_type 조건 |
| 고정 조건 | 실험 중 변경하지 않은 config |
| Seed | 실험 재현성을 위해 사용한 seed 값 |
| Batch size | 학습 또는 추론에 사용한 batch size |
| 핵심 지표 | 최종 판단에 우선 사용하는 지표 |
| 보조 지표 | 판단 보조에 사용하는 지표 |
| 결과 및 계산 기준 | 동일 test split 또는 동일 평가 기준에서 계산한 결과 |
| 최종 선택 | 실험 결과에 따라 선택한 Fusion 방식 또는 후처리 조건 |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | Fusion 결과 JSON, metric 결과, pair overlay, 실패 케이스, latency 측정 결과 |
| 메모 | 결과 해석, 문제점, 다음 조치 |

---

## 8. 실험별 결과 템플릿

### FUS-EXP-01. 단건 대비 Fusion 비교

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | RGB-only / Thermal-only / Late Fusion 비교 |
| 담당자 |  |
| 비교 대상 | RGB-only / Thermal-only / Late Fusion |
| 고정 조건 | 동일 test split 또는 동일 평가 기준, 동일 입력 해상도 |
| Seed | 42 |
| Batch size | 단건 모델 기준 기록 |
| 핵심 지표 | Fusion 개선 효과, mAP50-95 / mAP50, class별 Recall |
| 보조 지표 | 모달 보완 샘플 수, Fusion 악화 샘플 수, 실패 케이스 수 |
| 결과 및 계산 기준 | 단건 baseline 대비 Late Fusion 결과 개선 여부 확인 |
| 최종 선택 |  |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | fusion_vs_single_metric.csv, metric 결과표, modality_complement_cases.csv, fusion_regression_cases.csv, pair overlay, 실패 케이스 샘플 |
| 메모 |  |

### FUS-EXP-02. Late Fusion 방식 비교

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Late Fusion 후처리 방식 비교 |
| 담당자 |  |
| 비교 대상 | score 결합 / NMS / weighted score fusion / severity rule |
| 고정 조건 | FUS-EXP-01에서 사용한 단건 모델 결과, 동일 validation/test 결과 |
| Seed | 42 |
| Batch size | 해당 없음 |
| 핵심 지표 | F1-score, Precision, Recall, 평균 latency |
| 보조 지표 | threshold별 score 분포, Fusion 악화 샘플 수, 모델/후처리 복잡도 |
| 결과 및 계산 기준 | 재학습 없이 단건 모델 추론 결과를 기준으로 Fusion 후처리 방식 비교 |
| 최종 선택 |  |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | fusion 방식별 metric 표, threshold별 결과표, fusion_regression_cases.csv, fusion_complexity_report.md, latency 측정 결과 |
| 메모 |  |

### FUS-EXP-03. pair_type 영향 확인

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | pair_type별 Fusion 성능 확인 |
| 담당자 |  |
| 비교 대상 | RGB_ONLY_DEFECT / THERMAL_ONLY_DEFECT / CORRELATED_DEFECT / MISMATCH_DEFECT |
| 고정 조건 | FUS-EXP-02에서 선택한 Late Fusion 방식 |
| Seed | 42 |
| Batch size | 해당 없음 |
| 핵심 지표 | pair_type별 Recall, pair_type별 F1-score |
| 보조 지표 | pair_type별 실패 케이스 수 |
| 결과 및 계산 기준 | pair_type별로 Fusion 결과가 단건 대비 안정적인지 확인 |
| 최종 선택 |  |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | pair_type_metric.csv, pair_type별 실패 케이스 overlay |
| 메모 |  |

### FUS-EXP-04. Pair 정합성 영향 확인

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | RGB-Thermal 위치 정합성 영향 확인 |
| 담당자 |  |
| 비교 대상 | 정합이 좋은 pair / 위치 오차가 있는 pair |
| 고정 조건 | FUS-EXP-02에서 선택한 Late Fusion 방식 |
| Seed | 42 |
| Batch size | 해당 없음 |
| 핵심 지표 | 정합 오차 구간별 Recall, 정합 오차 구간별 F1-score, 실패 케이스 수 |
| 보조 지표 | pair overlay 품질, mismatch sample 수 |
| 결과 및 계산 기준 | RGB-Thermal 위치 오차가 Fusion 결과에 미치는 영향 확인 |
| 최종 선택 |  |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | alignment_error_metric.csv, 정합 오차별 metric 표, pair overlay, mismatch sample |
| 메모 |  |

### FUS-EXP-05. Fusion 배포 가능성 확인

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Fusion 최종 후보 배포 가능성 확인 |
| 담당자 |  |
| 비교 대상 | Fusion 최종 후보 / ONNX Runtime CPU / 결과 포맷 |
| 고정 조건 | Fusion 최종 후보, 추론 batch size 1 |
| Seed | 해당 없음 |
| Batch size | 추론 batch size 1 |
| 핵심 지표 | ONNX 변환 성공 여부, CPU latency, 결과 포맷 정합성 |
| 보조 지표 | 모델 크기, 출력 안정성, 결과 필드 오류 수 |
| 결과 및 계산 기준 | Fusion 최종 후보가 선정된 이후 단건 배포 최적화 실험과 같은 기준으로 확인 |
| 최종 선택 |  |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | ONNX 파일, latency 측정 결과, result_format_check.json, 결과 JSON 샘플, overlay 이미지 |
| 메모 | Fusion 최종 후보가 없으면 수행하지 않음 |

---

## 9. 후속 검토

Late Fusion으로 충분한 개선이 없을 경우에만 Early Fusion을 추가 검토한다.

Early Fusion은 다음 조건을 만족할 때만 후속 후보로 검토한다.

| 조건 | 기준 |
| --- | --- |
| Pair 데이터 품질 | synthetic RGB-Thermal paired dataset의 사용 샘플이 충분해야 함 |
| 정합성 | RGB/Thermal crop 위치 정합성이 학습 가능한 수준이어야 함 |
| 성능 필요성 | Late Fusion이 단건 baseline 대비 충분한 개선을 보이지 못해야 함 |
| 구현 가능성 | 입력 구조, 전처리, 모델 입출력, ONNX 변환 가능성을 확인해야 함 |
| 배포 가능성 | CPU 추론 또는 운영 추론 구조에 적용 가능한지 확인해야 함 |

Intermediate Fusion, Attention Fusion, Transformer Fusion은 초기 Fusion 실험 범위에서 제외하고, 데이터와 단건 baseline이 안정화된 뒤 후속 연구 후보로 둔다.

---

## 10. 문서 적용 범위

본 문서는 **RGB-only / Thermal-only 단건 baseline과 단건 모델 배포 검증 이후 수행하는 Fusion 후속 실험**을 대상으로 한다.

현재 1차 범위는 RGB-only / Thermal-only 단건 baseline 구축과 단건 모델 배포 최적화이며, 본 Fusion 실험은 synthetic paired dataset과 Anomalib 품질 검증이 완료된 이후 수행한다.