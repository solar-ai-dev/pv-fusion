# 모델·데이터 실험 설계서

## 1. 실험 목적

MVP 단계에서는 RGB·열화상 단일 이미지 분석 모델과 **RGB-Thermal Fusion 모델의 성능과 서비스 적용 가능성**을 함께 검증

RGB 또는 열화상 단일 이미지만 있는 경우에는 단일 모달 모델로 분석하고, 동일 구역의 RGB·열화상 pair가 제공되는 경우에는 Fusion 모델로 분석하여 이상 후보 선별 정확도를 높이는 것을 목표로 함

---

## 2. 전체 실험 흐름

```text
데이터셋 선정 및 RGB-Thermal pair 구성
→ Synthetic Defect 생성 및 라벨링
→ Anomalib 기반 데이터 품질 검증
→ RGB-only / Thermal-only baseline 실험
→ RGB-Thermal Fusion 실험
→ 배포 최적화 실험
→ 평가지표 기준 정리
→ 모델 선정 기준 적용
→ 실험 결과 아카이브 누적
```

---

## 3. 실험 방향 요약

| 구분 | 데이터셋 | 실험 방향 |
| --- | --- | --- |
| RGB-Thermal pair | O&M RGB-Thermal 정상 pair | 드론 위치 기준 RGB·열화상 pair 구성 및 패널 단위 crop pair 생성 |
| Synthetic defect | 정상 crop + New Solar Panel RGB Faults + ThermoSolar-PV 기반 합성 데이터 | RGB 외관 결함 / Thermal 발열 결함 합성 및 bbox, mask, class, severity 자동 생성 |
| 품질 검증 | 정상 crop + synthetic defect crop | Anomalib memory bank 학습 후 anomaly heatmap과 generator mask/bbox 비교 |
| RGB | New Solar Panel RGB Faults / synthetic RGB dataset / 혼합 데이터셋 | RGB-only 단일 모달 baseline 학습 및 segmentation mask 활용 또는 bbox 변환 실험 |
| 열화상 | ThermoSolar-PV / synthetic Thermal dataset | Thermal-only 단일 모달 bbox 탐지 baseline 학습 및 diode·hotspot·substring·string fault class 참고 |
| Fusion | synthetic RGB-Thermal paired dataset | Early Fusion, Late Fusion 모델 학습 및 단일 모달 baseline과 동일 test split 기준 성능 비교 |
| 배포 최적화 | 최종 후보 모델 | ONNX 변환, CPU 추론, INT8 양자화 적용 가능성 검토 |

---

## 4. 하위 문서 구성

| 이름 | 텍스트 |
| --- | --- |
| 데이터셋 선정 | Fusion 학습용 synthetic paired dataset 생성을 위한 원천 데이터셋 선정 |
| Synthetic Defect 생성 및 라벨링 | RGB·열화상 결함 합성 방식 비교 및 자동 라벨 생성 기준 정리 |
| Anomalib 품질 검증 | 합성 결함 데이터가 이상 영역으로 인식되는지 검증 |
| RGB 단건 분석 실험 | RGB-only baseline 선정 |
| 열화상 단건 분석 실험 | Thermal-only baseline 선정 |
| RGB-Thermal Fusion 실험 | 단일 모달 대비 Fusion 성능 개선 여부 검증 |
| 배포 최적화 실험 | ONNX 변환, CPU 추론, INT8 양자화 검증 |
| 평가지표 및 선정 기준 | 전체 실험을 비교하기 위한 지표와 최종 모델 선정 기준 정리 |
| 실험 결과 아카이브 | 실험 config, 결과 수치, 모델 파일, 샘플 결과 누적 관리 |

---

# 데이터셋 선정

### 태양광 이미지 분석 단위

!image.png

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

---

# Synthetic Defect 생성 및 라벨링

## 1. 목적

RGB-Thermal Fusion 모델 학습에 사용할 synthetic paired dataset 생성 방식 비교

정상 RGB-Thermal crop pair에 RGB 외관 결함과 Thermal 발열 결함을 합성하고, 합성 시점에 bbox, mask, class, severity 라벨을 자동 생성할 수 있는 방식 선정

New Solar Panel RGB Faults와 Thermal Solar PV Anomaly Detection Dataset / ThermoSolar-PV는 공개 데이터셋을 그대로 Fusion 학습에 사용하는 것이 아니라, RGB 결함 mask/class와 Thermal 발열·전기 이상 bbox/class 참고, synthetic defect 생성 기준, 단일 모달 baseline 비교에 활용

---

## 2. 비교 대상

| 구분 | 사용 기술 / 모델 | 생성 내용 | 장점 | 한계 | 실험 목적 |
| --- | --- | --- | --- | --- | --- |
| Rule-based 합성 | Python, OpenCV, NumPy, Pillow | broken, snow, dusty, Electrical-Damage, missing, shading, hotspot, diode, substring, string fault를 규칙 기반으로 합성 | bbox, mask, class, severity 자동 생성이 쉬움 | 결함 질감이 단순하고 실제 결함과 차이가 있을 수 있음 | 라벨 자동 생성 기준선 확보 |
| GAN 기반 합성 | Pix2Pix, CycleGAN, Conditional GAN | New Solar Panel RGB Faults의 RGB 결함 mask/class를 참고해 RGB 결함 texture 생성 또는 정상 이미지를 결함 이미지처럼 변환 | rule-based보다 RGB 결함 질감이 자연스러울 수 있음 | 학습 데이터와 라벨 형태가 제한적이면 품질이 불안정하고 라벨 통제가 어려움 | RGB 결함 현실감 개선 가능성 확인 |
| Diffusion 기반 합성 | Stable Diffusion Inpainting, ControlNet, LoRA fine-tuning | mask 영역에 RGB 결함을 inpainting 방식으로 생성 | 결함 질감과 배경 조화가 가장 자연스러울 가능성 있음 | fine-tuning 비용이 있고 mask/class/severity 통제가 필요함 | 고품질 RGB synthetic defect 생성 가능성 확인 |
| Rule-based + Diffusion | OpenCV mask 생성 + Diffusion texture 보정 | 결함 위치와 mask는 rule-based로 생성하고 RGB 결함 질감은 diffusion으로 보정 | 라벨 통제성과 이미지 현실감의 균형을 맞출 수 있음 | 구현 복잡도가 증가하고 diffusion 결과 품질 검수가 필요함 | 최종 synthetic RGB 결함 생성 방식 후보 검토 |

---

## 3. 생성 대상

| 항목 | 내용 |
| --- | --- |
| 입력 데이터 | 정상 RGB-Thermal panel crop pair |
| RGB 결함 | broken, snow, dusty, Electrical-Damage, missing, shading |
| Thermal 결함 | Single Hotspot, Multi Hotspots, Single Diode, Multi Diode, Single Bypassed Substring, Multi Bypassed Substring, String Open Circuit, String Reversed Polarity |
| RGB 참고 데이터 | New Solar Panel RGB Faults |
| Thermal 참고 데이터 | Thermal Solar PV Anomaly Detection Dataset / ThermoSolar-PV |
| 생성 단위 | Panel crop 단위 |
| 생성 결과 | synthetic RGB crop, synthetic Thermal crop, bbox, mask, class, severity |
| 활용 목적 | RGB-only, Thermal-only, RGB-Thermal Fusion 모델 학습 |

---

## 4. 비교 실험 설계

| 실험 ID | 합성 방식 | RGB 생성 방식 | Thermal 생성 방식 | 라벨 생성 방식 | 비교 목적 |
| --- | --- | --- | --- | --- | --- |
| SYN-EXP-01 | Rule-based | OpenCV 기반 결함 overlay | Gaussian hotspot / thermal intensity 증가 / diode·substring·string fault 패턴 합성 | 합성 mask 기준 자동 생성 | 가장 단순한 기준선 생성 |
| SYN-EXP-02 | GAN | New Solar Panel RGB Faults의 mask/class를 참고한 GAN 기반 RGB 결함 texture 생성 | 1차 기준은 rule-based thermal 합성, ThermoSolar-PV class를 참고해 발열·전기 이상 유형 매핑 | mask 기반 bbox 생성 + class 수동 매핑 | rule-based 대비 RGB 결함 현실감 개선 여부 확인 |
| SYN-EXP-03 | Diffusion Inpainting | mask 영역에 RGB 결함 inpainting | 1차 기준은 rule-based thermal 합성, ThermoSolar-PV bbox/class를 참고해 thermal 이상 유형 매핑 | mask 기반 bbox 생성 + class 수동 매핑 | 고품질 RGB 합성 이미지 생성 가능성 확인 |
| SYN-EXP-04 | Rule-based + Diffusion | 결함 위치와 mask는 rule-based로 생성, RGB 질감은 diffusion으로 보정 | 1차 기준은 rule-based thermal 합성, ThermoSolar-PV를 Thermal-only 비교 검증에 활용 | rule-based mask 기준 자동 생성 | 라벨 통제성과 이미지 현실감 균형 확인 |

---

## 5. 평가 기준

| 평가 항목 | 설명 |
| --- | --- |
| 라벨 정확성 | bbox, mask가 실제 합성 결함 영역과 일치하는지 확인 |
| 결함 현실감 | 합성 결함이 New Solar Panel RGB Faults의 RGB 외관 결함 또는 ThermoSolar-PV의 thermal 발열·전기 이상 패턴과 비교했을 때 유사한지 확인 |
| Pair 정합성 | RGB 결함과 Thermal 발열 결함이 같은 패널 위치 기준으로 대응되는지 확인 |
| Class 정합성 | RGB 결함 class와 Thermal 이상 class가 synthetic dataset의 class 체계와 맞는지 확인 |
| 다양성 | 결함 크기, 위치, 형태, 강도가 충분히 다양하게 생성되는지 확인 |
| 재현성 | 동일 설정으로 같은 합성 결과를 다시 생성할 수 있는지 확인 |
| 학습 기여도 | 합성 데이터로 학습한 모델 성능이 baseline 대비 개선되는지 확인 |
| 생성 비용 | 데이터 생성 시간, 모델 학습 필요 여부, 구현 복잡도 비교 |

---

# Anomalib 품질 검증

## 1. 목적

Synthetic Defect 생성 단계에서 만든 합성 결함 데이터의 품질 검증

정상 RGB crop과 정상 Thermal crop으로 각각 Anomalib memory bank를 학습하고, synthetic defect crop에 대해 anomaly heatmap을 생성한 뒤 generator mask/bbox와 비교하여 합성 결함이 이상 영역으로 인식되는지 확인

New Solar Panel RGB Faults와 Thermal Solar PV Anomaly Detection Dataset / ThermoSolar-PV의 class 기준을 참고하여 synthetic defect의 class 매핑과 모달별 이상 반응이 실험 목적에 맞는지 확인

---

## 2. 비교 대상

| 구분 | 사용 기술 / 모델 | 입력 데이터 | 비교 내용 | 실험 목적 |
| --- | --- | --- | --- | --- |
| RGB 품질 검증 | Anomalib | 정상 RGB crop, synthetic RGB defect crop | RGB anomaly heatmap과 generator mask/bbox 비교 | RGB 합성 결함 사용 가능성 확인 |
| Thermal 품질 검증 | Anomalib | 정상 Thermal crop, synthetic Thermal defect crop | Thermal anomaly heatmap과 generator mask/bbox 비교 | Thermal 합성 발열 결함 사용 가능성 확인 |
| Normal 검증 | Anomalib | 정상 RGB crop, 정상 Thermal crop | 정상 crop에서 anomaly 반응이 과도하게 발생하는지 확인 | 정상 데이터 기준 반응 확인 |
| Pair sample 검증 | Anomalib | synthetic RGB-Thermal crop pair | RGB crop과 Thermal crop을 각각 모달별 memory bank 기준으로 검증 | Fusion 학습용 pair sample의 모달별 품질 확인 |

---

## 3. 검증 대상

| 항목 | 내용 |
| --- | --- |
| 입력 데이터 | 정상 RGB crop, 정상 Thermal crop, synthetic RGB defect crop, synthetic Thermal defect crop |
| 기준 라벨 | generator가 생성한 bbox, mask, class, severity |
| 검증 결과 | anomaly heatmap, anomaly score, mask/bbox 비교 결과 |
| 활용 목적 | synthetic dataset 사용 / 보류 / 제외 판단 |

---

## 4. 비교 실험 설계

| 실험 ID | 검증 방식 | Anomalib 학습 데이터 | 검증 대상 | 비교 방식 | 비교 목적 |
| --- | --- | --- | --- | --- | --- |
| ANO-EXP-01 | RGB anomaly 검증 | 정상 RGB crop | RGB synthetic defect crop | RGB heatmap과 generator mask/bbox 비교 | New Solar Panel RGB Faults의 RGB 결함 mask/class 기준을 참고한 RGB 합성 결함 품질 확인 |
| ANO-EXP-02 | Thermal anomaly 검증 | 정상 Thermal crop | Thermal synthetic defect crop | Thermal heatmap과 generator mask/bbox 비교 | Thermal Solar PV Anomaly Detection Dataset / ThermoSolar-PV의 Thermal 이상 class 기준을 참고한 Thermal 합성 발열 결함 품질 확인 |
| ANO-EXP-03 | Normal 반응 검증 | 정상 RGB crop / 정상 Thermal crop | 정상 RGB crop / 정상 Thermal crop | 정상 crop의 anomaly score 확인 | 정상 데이터 오탐 여부 확인 |
| ANO-EXP-04 | Pair sample 검증 | 정상 RGB crop / 정상 Thermal crop | synthetic RGB-Thermal crop pair | RGB와 Thermal을 각각의 heatmap 기준으로 확인 | Fusion 학습용 pair sample의 모달별 품질 확인 |

---

## 5. 평가 기준

| 평가 항목 | 설명 |
| --- | --- |
| Mask-Heatmap 일치도 | generator mask와 thresholded anomaly heatmap 영역이 겹치는지 확인 |
| BBox 포함 여부 | anomaly heatmap의 주요 반응 영역이 generator bbox 내부에 포함되는지 여부 |
| Anomaly score | synthetic defect crop이 정상 crop 대비 충분히 이상으로 판단되는지 확인 |
| 정상 오탐 여부 | 정상 crop에서 anomaly 반응이 과도하게 발생하지 않는지 확인 |
| 모달별 반응 | RGB 결함은 RGB heatmap에서, Thermal 발열 결함은 Thermal heatmap에서 반응하는지 확인 |
| Pair sample 품질 | RGB와 Thermal 각각의 합성 결함이 모달별 기준에서 이상 영역으로 인식되는지 확인 |
| 사용 가능성 | synthetic sample을 사용 / 보류 / 제외 중 어떤 상태로 둘지 판단 |

---

# RGB 단건 분석 실험

## 1. 목적

RGB 단일 이미지 기준 외관 이상 탐지 성능 확인

New Solar Panel RGB Faults, synthetic RGB dataset, 공개+synthetic 혼합 데이터를 비교하여 RGB-Thermal Fusion 모델과 비교할 RGB-only baseline 선정

---

## 2. 비교 대상

| 구분 | 비교 항목 | 후보 |
| --- | --- | --- |
| 데이터셋 | 학습 데이터 구성 | New Solar Panel RGB Faults / synthetic RGB defect dataset / 공개+synthetic 혼합 |
| 모델 | 탐지 모델 구조 | YOLOv8n-seg / YOLOv8s-seg 또는 YOLOv8n / YOLOv8s |
| 입력 해상도 | 모델 입력 크기 | 512×512 / 640×640 / 768×768 |
| 데이터 증강 | Augmentation 강도 | 기본 증강 / 강한 증강 |
| 후처리 | Threshold 설정 | confidence threshold / NMS IoU |

---

## 3. 기존 조건

| 항목 | 초기 config |
| --- | --- |
| 기본 데이터셋 | New Solar Panel RGB Faults / synthetic RGB defect dataset |
| 기본 모델 | YOLOv8s-seg 또는 YOLOv8s |
| 입력 해상도 | 640×640 |
| 학습 단위 | Panel crop |
| 결함 유형 | broken, snow, dusty, Electrical-Damage, missing, shading 등 |
| 라벨 형식 | mask, bbox, class |
| 출력 결과 | bbox, mask, class, confidence |
| Epoch | 100 |
| Batch size | 16 |
| Augmentation | flip, brightness, contrast, blur |
| Train / Val / Test | 8 : 1 : 1 |
| 후처리 | confidence threshold, NMS, severity rule 적용 |

---

## 4. 비교 실험 설계

| 실험 ID | 비교 변수 | 비교 내용 |
| --- | --- | --- |
| RGB-EXP-01 | 데이터셋 구성 | New Solar Panel RGB Faults / synthetic RGB defect dataset / 공개+synthetic 혼합 중 RGB-only baseline에 가장 적합한 데이터 구성 비교 |
| RGB-EXP-02 | 모델 구조 | YOLOv8n-seg / YOLOv8s-seg 또는 YOLOv8n / YOLOv8s 중 성능과 추론 속도 균형 비교 |
| RGB-EXP-03 | 입력 해상도 | 512×512 / 640×640 / 768×768 중 탐지 성능과 추론 시간 균형 비교 |
| RGB-EXP-04 | Augmentation 강도 | 기본 증강 / 강한 증강 중 일반화 성능 개선 여부 비교 |
| RGB-EXP-05 | 후처리 Threshold | confidence threshold / NMS IoU 변화에 따른 오탐·미탐 변화 비교 |

---

## 5. 평가 기준

| 평가 항목 | 설명 |
| --- | --- |
| 탐지 성능 | RGB 외관 이상 영역을 mask 또는 bbox 기준으로 탐지할 수 있는지 확인 |
| 분류 성능 | broken, snow, dusty, Electrical-Damage, missing, shading class를 구분할 수 있는지 확인 |
| 데이터셋 효과 | 공개 데이터, synthetic 데이터, 혼합 데이터 중 RGB-only baseline에 적합한 구성을 확인 |
| 모델·해상도 영향 | YOLOv8n-seg / YOLOv8s-seg 또는 YOLOv8n / YOLOv8s, 512 / 640 / 768 입력 조건에 따른 성능과 추론 시간 비교 |
| Fusion 비교 기준성 | 동일 test split에서 RGB-Thermal Fusion 모델과 비교 가능한 RGB-only 기준선인지 확인 |
| 배포 가능성 | ONNX 변환과 CPU 추론 적용 가능성 확인 |

---

## 6. 후속 실험

기본 실험에서 성능이 부족한 경우 optimizer, learning rate, scheduler, loss weight를 추가 튜닝

| 구분 | 후속 비교 항목 |
| --- | --- |
| Optimizer | SGD / AdamW |
| Learning rate | 기본값 / 낮은 LR / 높은 LR |
| Scheduler | 기본 scheduler / cosine / step |
| Loss weight | bbox loss, mask loss, class loss, objectness loss 가중치 조정 |

---

# 열화상 단건 분석 실험

## 1. 목적

열화상 단일 이미지 기준 발열 이상 탐지 성능 확인

ThermoSolar-PV, synthetic Thermal dataset, 공개+synthetic 혼합 데이터를 비교하여 Thermal-only 탐지 baseline을 구성하고, 발열·전기 이상 class 기준과 검증 결과를 함께 확인

---

## 2. 비교 대상

| 구분 | 비교 항목 | 후보 |
| --- | --- | --- |
| 데이터셋 | 학습·검증 데이터 구성 | ThermoSolar-PV / synthetic Thermal defect dataset / synthetic + 공개 데이터 class 참고 |
| 모델 | 탐지 모델 구조 | YOLOv8n / YOLOv8s |
| 입력 해상도 | 모델 입력 크기 | 512×512 / 640×640 / 768×768 |
| 데이터 증강 | Augmentation 강도 | 기본 증강 / 강한 증강 |
| 후처리 | Threshold 설정 | confidence threshold / NMS IoU |

---

## 3. 기존 조건

| 항목 | 초기 config |
| --- | --- |
| 기본 데이터셋 | ThermoSolar-PV / synthetic Thermal defect dataset |
| 공개 데이터 활용 | ThermoSolar-PV는 Thermal anomaly bbox baseline 및 diode·hotspot·substring·string fault class 참고에 활용 |
| 기본 모델 | YOLOv8s |
| 입력 해상도 | 640×640 |
| 학습 단위 | Panel crop |
| 결함 유형 | Single Hotspot, Multi Hotspots, Single Diode, Multi Diode, Single Bypassed Substring, Multi Bypassed Substring, String Open Circuit, String Reversed Polarity |
| 라벨 형식 | bbox, class |
| 출력 결과 | bbox, class, confidence |
| Epoch | 100 |
| Batch size | 16 |
| Augmentation | flip, brightness, contrast, blur |
| Train / Val / Test | 8 : 1 : 1 |
| 후처리 | confidence threshold, NMS, severity rule 적용 |

---

## 4. 비교 실험 설계

| 실험 ID | 비교 변수 | 비교 내용 |
| --- | --- | --- |
| TH-EXP-01 | 데이터셋 구성 | ThermoSolar-PV / synthetic Thermal defect dataset / synthetic + 공개 데이터 class 참고 중 Thermal-only baseline에 가장 적합한 데이터 구성 비교 |
| TH-EXP-02 | 모델 구조 | YOLOv8n / YOLOv8s 중 탐지 성능과 추론 속도 균형 비교 |
| TH-EXP-03 | 입력 해상도 | 512×512 / 640×640 / 768×768 중 탐지 성능과 추론 시간 균형 비교 |
| TH-EXP-04 | Augmentation 강도 | 기본 증강 / 강한 증강 중 일반화 성능 개선 여부 비교 |
| TH-EXP-05 | 후처리 Threshold | confidence threshold / NMS IoU 변화에 따른 오탐·미탐 변화 비교 |

---

## 5. 평가 기준

| 평가 항목 | 설명 |
| --- | --- |
| 탐지 성능 | bbox 기준 발열·전기 이상 영역 탐지 성능 확인 |
| 분류 성능 | hotspot, diode, bypassed substring, string fault class 분류 성능 확인 |
| 데이터셋 효과 | ThermoSolar-PV와 synthetic Thermal 데이터 기반 학습 안정성 및 공개 데이터 class 참고 가능성 확인 |
| 모델·해상도 영향 | YOLOv8n / YOLOv8s, 512 / 640 / 768 입력 조건에 따른 성능과 추론 시간 비교 |
| Fusion 비교 기준성 | 동일 test split에서 RGB-Thermal Fusion 모델과 비교 가능한 Thermal-only 기준선인지 확인 |
| 배포 가능성 | ONNX 변환과 CPU 추론 적용 가능성 확인 |

---

## 6. 후속 실험

기본 실험에서 성능이 부족한 경우 optimizer, learning rate, scheduler, loss weight를 추가 튜닝

| 구분 | 후속 비교 항목 |
| --- | --- |
| Optimizer | SGD / AdamW |
| Learning rate | 기본값 / 낮은 LR / 높은 LR |
| Scheduler | 기본 scheduler / cosine / step |
| Loss weight | bbox loss, class loss, objectness loss 가중치 조정 |

---

# RGB-Thermal Fusion 실험

## 1. 목적

RGB-Thermal pair 입력 기준 이상 탐지 성능 확인

RGB-only baseline, Thermal-only baseline과 동일 test split 기준으로 비교하여 Fusion 모델이 단일 모달 모델보다 이상 후보 선별 성능을 개선하는지 검증

---

## 2. 비교 대상

| 구분 | 비교 항목 | 후보 |
| --- | --- | --- |
| 입력 구성 | 모델 입력 데이터 | RGB-only / Thermal-only / RGB-Thermal pair |
| Fusion 방식 | 모달 결합 방식 | Early Fusion / Late Fusion |
| 모델 | 탐지 모델 구조 | YOLOv8s 기반 Fusion 모델 / RGB-only YOLOv8s-seg 또는 YOLOv8s / Thermal-only YOLOv8s |
| 입력 해상도 | 모델 입력 크기 | 640×640 기준, 필요 시 512×512 / 768×768 |
| 후처리 | 결과 결합 방식 | confidence threshold / NMS IoU / weighted score fusion |

---

## 3. 기존 조건

| 항목 | 초기 config |
| --- | --- |
| 기본 데이터셋 | O&M 정상 pair + New Solar Panel RGB Faults + ThermoSolar-PV 기반 synthetic RGB-Thermal paired dataset |
| 기본 모델 | YOLOv8s 기반 Fusion 모델 |
| 입력 해상도 | 640×640 |
| 학습 단위 | Panel crop pair |
| 입력 구성 | New Solar Panel RGB Faults 기반 RGB 결함 합성 crop + ThermoSolar-PV 기반 Thermal 결함 합성 crop |
| 결함 유형 | broken, snow, dusty, Electrical-Damage, missing, shading, Single Hotspot, Multi Hotspots, Single Diode, Multi Diode, Single Bypassed Substring, Multi Bypassed Substring, String Open Circuit, String Reversed Polarity |
| 라벨 형식 | bbox, mask, class |
| 출력 결과 | bbox, mask, class, confidence |
| Epoch | 100 |
| Batch size | 16 |
| Augmentation | RGB/Thermal pair 동기화 augmentation |
| Train / Val / Test | 8 : 1 : 1 |
| 비교 조건 | RGB-only / Thermal-only / Fusion 모델은 동일 test split 기준으로 비교 |
| 후처리 | confidence threshold, NMS, severity rule 적용 |

---

## 4. 비교 실험 설계

| 실험 ID | 비교 변수 | 비교 내용 |
| --- | --- | --- |
| FUS-EXP-01 | 입력 구성 | 동일 test split에서 New Solar Panel RGB Faults 기반 RGB-only / ThermoSolar-PV 기반 Thermal-only / synthetic RGB-Thermal pair 입력 간 탐지·segmentation 성능 비교 |
| FUS-EXP-02 | Fusion 방식 | Early Fusion / Late Fusion 중 성능과 구현 안정성 비교 |
| FUS-EXP-03 | 결과 결합 방식 | Late Fusion에서 confidence score 결합, NMS IoU, weighted score fusion 방식 비교 |
| FUS-EXP-04 | 입력 해상도 | 512×512 / 640×640 / 768×768 중 Fusion 모델 성능과 추론 시간 비교 |
| FUS-EXP-05 | Pair 정합성 | 정합이 좋은 pair / 위치 오차가 있는 pair에서 Fusion 성능 변화 확인 |

---

## 5. 평가 기준

| 평가 항목 | 설명 |
| --- | --- |
| Fusion 개선 효과 | 동일 test split에서 RGB-only, Thermal-only 대비 Fusion 모델 성능 향상 여부 확인 |
| 탐지 성능 | bbox 기준 이상 영역 탐지 성능 확인 |
| Segmentation 성능 | New Solar Panel RGB Faults의 RGB mask 기준 이상 영역 segmentation 성능 확인 |
| 분류 성능 | New Solar Panel RGB Faults의 RGB 결함 class와 ThermoSolar-PV의 Thermal anomaly class 분류 성능 확인 |
| 모달 보완 효과 | RGB 외관 결함과 Thermal 발열·전기 이상이 서로 보완되는지 확인 |
| Pair 정합성 영향 | RGB-Thermal 위치 정합이 성능에 미치는 영향 확인 |
| 추론 시간 | 단일 모달 대비 Fusion 추론 시간이 서비스 적용 범위인지 확인 |
| 배포 가능성 | ONNX 변환과 CPU 추론 적용 가능성 확인 |

---

## 6. 후속 실험

기본 실험에서 Fusion 성능이 단일 모달 대비 충분히 개선되지 않는 경우 Intermediate Fusion, Attention Fusion, Transformer 기반 Fusion을 추가 검토

| 구분 | 후속 비교 항목 |
| --- | --- |
| Intermediate Fusion | RGB/Thermal backbone feature 중간 결합 |
| Attention Fusion | RGB/Thermal feature 중요도 기반 결합 |
| Transformer Fusion | RGB/Thermal pair feature를 token 기반으로 결합 |
| Loss tuning | RGB mask, Thermal bbox, class 불균형에 따른 loss weight 조정 |
| Pair alignment 보정 | RGB-Thermal 위치 오차 보정 전처리 적용 |

---

# 배포 최적화 실험

## 1. 목적

최종 후보 모델의 서비스 배포 가능성 검증

PyTorch 모델을 ONNX 형식으로 변환하고, ONNX Runtime 기반 CPU 추론과 INT8 양자화를 비교하여 정확도 손실, 추론 시간, 모델 크기를 확인

---

## 2. 비교 대상

| 구분 | 비교 항목 | 후보 |
| --- | --- | --- |
| 모델 형식 | 추론 모델 포맷 | PyTorch FP32 / ONNX FP32 / ONNX INT8 |
| 추론 환경 | 실행 방식 | PyTorch 직접 추론 / ONNX Runtime CPU |
| 최적화 방식 | 양자화 여부 | FP32 유지 / INT8 양자화 |
| 입력 유형 | 분석 입력 | RGB 단일 / Thermal 단일 / RGB-Thermal pair |
| 입력 해상도 | 모델 입력 크기 | 최종 선정 해상도 기준 |

---

## 3. 기존 조건

| 항목 | 초기 config |
| --- | --- |
| 대상 모델 | RGB-only / Thermal-only / RGB-Thermal Fusion 최종 후보 모델 |
| 기준 모델 형식 | PyTorch FP32 |
| 변환 형식 | ONNX FP32 |
| 추론 엔진 | ONNX Runtime CPU |
| 양자화 방식 | ONNX INT8 |
| Calibration dataset | New Solar Panel RGB Faults, ThermoSolar-PV, synthetic RGB-Thermal paired dataset의 validation set 일부 사용 |
| 입력 해상도 | 각 실험에서 최종 선정된 해상도 |
| 테스트 단위 | 단건 이미지 또는 RGB-Thermal pair |
| 비교 기준 | 변환 전후 출력 일치성, 추론 시간, 모델 크기, 정확도 손실 |
| 유지 기준 | INT8 성능 손실이 크면 ONNX FP32를 최종 배포 후보로 유지 |

---

## 4. 비교 실험 설계

| 실험 ID | 비교 변수 | 비교 내용 |
| --- | --- | --- |
| DEP-EXP-01 | 모델 포맷 | PyTorch FP32 / ONNX FP32 변환 전후 출력 결과 일치성 비교 |
| DEP-EXP-02 | 추론 엔진 | PyTorch 직접 추론 / ONNX Runtime CPU 기준 단건 추론 시간 비교 |
| DEP-EXP-03 | 양자화 | ONNX FP32 / ONNX INT8 간 정확도 손실, 추론 시간, 모델 크기 비교 |
| DEP-EXP-04 | 입력 유형 | RGB 단일 / Thermal 단일 / RGB-Thermal pair 입력별 추론 시간과 결과 안정성 비교 |
| DEP-EXP-05 | 모델 크기 | RGB-only / Thermal-only / Fusion 후보 모델의 파일 크기와 배포 부담 비교 |

---

## 5. 평가 기준

| 평가 항목 | 설명 |
| --- | --- |
| 출력 일치성 | PyTorch FP32와 ONNX FP32의 bbox, mask, class, confidence 결과가 일치하는지 확인 |
| 정확도 손실 | ONNX FP32 대비 ONNX INT8 변환 후 탐지·segmentation 성능 저하 확인 |
| 추론 시간 | 단건 이미지 또는 pair 입력 기준 CPU 추론 시간 확인 |
| 모델 크기 | PyTorch, ONNX FP32, ONNX INT8 모델 파일 크기 비교 |
| 결과 안정성 | 동일 입력에서 bbox, mask, class, confidence가 안정적으로 출력되는지 확인 |
| 배포 적합성 | FastAPI AI Server와 ONNX Runtime CPU 환경에서 실행 가능한지 확인 |
| 최종 후보 판단 | INT8 성능 손실이 크면 ONNX FP32를 최종 배포 후보로 유지 |

---

## 6. 후속 실험

기본 최적화 실험에서 추론 시간이 부족하거나 INT8 정확도 손실이 큰 경우 추가 최적화 방식을 검토

| 구분 | 후속 비교 항목 |
| --- | --- |
| Quantization 방식 | Dynamic quantization / Static quantization |
| 모델 경량화 | YOLOv8n 재검토 / pruning / distillation |
| 추론 환경 | CPU thread 수 조정 / batch size 1 고정 |
| 입력 해상도 | 성능 손실을 감수한 입력 해상도 축소 |
| 배포 구조 | AI Server instance 분리 / 비동기 queue 처리 강화 |

---

# 평가지표 및 선정 기준

## 1. 목적

모델·데이터 실험 결과를 실험 ID 기준으로 누적 관리

각 실험에서 무엇을 비교했는지, 어떤 지표와 계산 기준으로 판단했는지, 최종적으로 어떤 방식을 선택했는지 기록

---

## 2. 기록 방식

각 실험은 하나의 피드 단위로 작성한다.

| 항목 | 설명 |
| --- | --- |
| 실험 ID | 실험을 구분하는 고유 ID |
| 비교 대상 | 해당 실험에서 비교한 데이터셋, 모델, 합성 방식, 해상도, 배포 형식 등 |
| 고정 조건 | 실험 중 변경하지 않은 기준 config |
| 핵심 지표 | 최종 판단에 우선 사용하는 지표 |
| 결과 및 계산 기준 | 실험 결과값과 해당 지표를 계산한 기준 |
| 최종 선택 | 실험 결과에 따라 선택한 방식 |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | 모델 파일, 로그, 시각화 결과, heatmap, ONNX 파일 경로 |
| 메모 | 결과 해석, 문제점, 다음 조치 |

---

## 3. Synthetic Defect 생성 결과

### SYN-EXP-01

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Rule-based 합성 |
| 비교 대상 | OpenCV 기반 RGB 결함 overlay / Gaussian hotspot / thermal intensity 증가 |
| 고정 조건 | 정상 RGB-Thermal panel crop pair |
| 핵심 지표 | 라벨 정확성 |
| 결과 및 계산 기준 | 생성 mask 기준 bbox, class, severity 자동 생성 결과 확인 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### SYN-EXP-02

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | GAN 합성 |
| 비교 대상 | Pix2Pix / CycleGAN / Conditional GAN |
| 고정 조건 | 정상 RGB-Thermal panel crop pair |
| 핵심 지표 | 결함 현실감 |
| 결과 및 계산 기준 | 생성 이미지 품질과 mask 기반 bbox/class 매핑 가능성 확인 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### SYN-EXP-03

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Diffusion Inpainting |
| 비교 대상 | Stable Diffusion Inpainting / ControlNet / LoRA fine-tuning |
| 고정 조건 | 정상 RGB-Thermal panel crop pair |
| 핵심 지표 | 결함 현실감 |
| 결과 및 계산 기준 | mask 영역 생성 품질과 bbox/mask 유지 여부 확인 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### SYN-EXP-04

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Rule-based + Diffusion |
| 비교 대상 | Rule-based mask 생성 + Diffusion texture 보정 |
| 고정 조건 | 정상 RGB-Thermal panel crop pair |
| 핵심 지표 | 라벨 정확성 + 결함 현실감 |
| 결과 및 계산 기준 | rule-based mask/bbox 유지 여부와 diffusion 보정 후 이미지 품질 확인 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

---

## 4. Anomalib 품질 검증 결과

### ANO-EXP-01

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | RGB anomaly 검증 |
| 비교 대상 | RGB anomaly heatmap / generator mask·bbox |
| 고정 조건 | 정상 RGB crop memory bank |
| 핵심 지표 | Mask-Heatmap 일치도 |
| 결과 및 계산 기준 | RGB synthetic defect 영역과 anomaly heatmap 반응 영역 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### ANO-EXP-02

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Thermal anomaly 검증 |
| 비교 대상 | Thermal anomaly heatmap / generator mask·bbox |
| 고정 조건 | 정상 Thermal crop memory bank |
| 핵심 지표 | Mask-Heatmap 일치도 |
| 결과 및 계산 기준 | Thermal synthetic defect 영역과 anomaly heatmap 반응 영역 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### ANO-EXP-03

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Normal 반응 검증 |
| 비교 대상 | 정상 RGB crop / 정상 Thermal crop |
| 고정 조건 | 정상 crop memory bank |
| 핵심 지표 | 정상 오탐 여부 |
| 결과 및 계산 기준 | 정상 crop에서 anomaly 반응이 과도하게 발생하는지 확인 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### ANO-EXP-04

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Pair sample 검증 |
| 비교 대상 | synthetic RGB-Thermal crop pair |
| 고정 조건 | RGB/Thermal 모달별 memory bank |
| 핵심 지표 | 모달별 반응 일치 |
| 결과 및 계산 기준 | RGB와 Thermal 각각의 heatmap이 각 모달의 generator mask/bbox와 맞는지 확인 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

---

## 5. RGB 단건 분석 결과

### RGB-EXP-01

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | RGB 데이터셋 구성 비교 |
| 비교 대상 | PV-Multi-Defect Dataset / synthetic RGB defect dataset / 공개+synthetic 혼합 |
| 고정 조건 | YOLOv8s, 640×640, epoch 100 |
| 핵심 지표 | Recall, F1-score |
| 결과 및 계산 기준 | test set에서 정답 bbox/class와 예측 bbox/class 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### RGB-EXP-02

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | RGB 모델 구조 비교 |
| 비교 대상 | YOLOv8n / YOLOv8s |
| 고정 조건 | RGB-EXP-01 선정 데이터셋, 640×640 |
| 핵심 지표 | Recall, F1-score, 추론 시간 |
| 결과 및 계산 기준 | 동일 test set에서 모델별 탐지 성능과 추론 시간 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### RGB-EXP-03

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | RGB 입력 해상도 비교 |
| 비교 대상 | 512×512 / 640×640 / 768×768 |
| 고정 조건 | RGB-EXP-02 선정 모델 |
| 핵심 지표 | Recall, F1-score, 추론 시간 |
| 결과 및 계산 기준 | 해상도별 탐지 성능과 추론 시간 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### RGB-EXP-04

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | RGB Augmentation 비교 |
| 비교 대상 | 기본 증강 / 강한 증강 |
| 고정 조건 | RGB 선정 데이터셋, 선정 모델, 선정 해상도 |
| 핵심 지표 | F1-score |
| 결과 및 계산 기준 | 증강 강도별 일반화 성능 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### RGB-EXP-05

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | RGB Threshold 비교 |
| 비교 대상 | confidence threshold / NMS IoU |
| 고정 조건 | RGB 선정 데이터셋, 선정 모델, 선정 해상도 |
| 핵심 지표 | Precision, Recall |
| 결과 및 계산 기준 | threshold 변경에 따른 오탐·미탐 변화 확인 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

---

## 6. 열화상 단건 분석 결과

### TH-EXP-01

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Thermal 데이터셋 구성 비교 |
| 비교 대상 | synthetic Thermal defect dataset / InfraredSolarModules 외부 검증 |
| 고정 조건 | YOLOv8s, 640×640, epoch 100 |
| 핵심 지표 | Recall, F1-score |
| 결과 및 계산 기준 | synthetic Thermal test set 결과와 공개 데이터 class 참고 결과 확인 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### TH-EXP-02

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Thermal 모델 구조 비교 |
| 비교 대상 | YOLOv8n / YOLOv8s |
| 고정 조건 | TH-EXP-01 선정 데이터 구성, 640×640 |
| 핵심 지표 | Recall, F1-score, 추론 시간 |
| 결과 및 계산 기준 | 동일 test set에서 모델별 탐지 성능과 추론 시간 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### TH-EXP-03

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Thermal 입력 해상도 비교 |
| 비교 대상 | 512×512 / 640×640 / 768×768 |
| 고정 조건 | TH-EXP-02 선정 모델 |
| 핵심 지표 | Recall, F1-score, 추론 시간 |
| 결과 및 계산 기준 | 해상도별 탐지 성능과 추론 시간 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### TH-EXP-04

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Thermal Augmentation 비교 |
| 비교 대상 | 기본 증강 / 강한 증강 |
| 고정 조건 | Thermal 선정 데이터셋, 선정 모델, 선정 해상도 |
| 핵심 지표 | F1-score |
| 결과 및 계산 기준 | 증강 강도별 일반화 성능 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### TH-EXP-05

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Thermal Threshold 비교 |
| 비교 대상 | confidence threshold / NMS IoU |
| 고정 조건 | Thermal 선정 데이터셋, 선정 모델, 선정 해상도 |
| 핵심 지표 | Precision, Recall |
| 결과 및 계산 기준 | threshold 변경에 따른 오탐·미탐 변화 확인 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

---

## 7. RGB-Thermal Fusion 분석 결과

### FUS-EXP-01

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | 입력 구성 비교 |
| 비교 대상 | RGB-only / Thermal-only / RGB-Thermal Fusion |
| 고정 조건 | 동일 test split |
| 핵심 지표 | Fusion 개선 효과 |
| 결과 및 계산 기준 | 동일 test split에서 단일 모달 최고 성능 대비 Fusion 성능 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### FUS-EXP-02

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Fusion 방식 비교 |
| 비교 대상 | Early Fusion / Late Fusion |
| 고정 조건 | synthetic RGB-Thermal paired dataset |
| 핵심 지표 | Fusion 개선 효과, 추론 시간 |
| 결과 및 계산 기준 | Early Fusion과 Late Fusion의 성능·구현 안정성 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### FUS-EXP-03

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | 결과 결합 방식 비교 |
| 비교 대상 | confidence score 결합 / NMS IoU / weighted score fusion |
| 고정 조건 | Late Fusion |
| 핵심 지표 | F1-score |
| 결과 및 계산 기준 | 결과 결합 방식별 오탐·미탐 변화 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### FUS-EXP-04

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Fusion 입력 해상도 비교 |
| 비교 대상 | 512×512 / 640×640 / 768×768 |
| 고정 조건 | 선정 Fusion 방식 |
| 핵심 지표 | Recall, F1-score, 추론 시간 |
| 결과 및 계산 기준 | 해상도별 Fusion 성능과 추론 시간 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### FUS-EXP-05

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Pair 정합성 비교 |
| 비교 대상 | 정합이 좋은 pair / 위치 오차가 있는 pair |
| 고정 조건 | 선정 Fusion 모델 |
| 핵심 지표 | 성능 저하 폭 |
| 결과 및 계산 기준 | pair 위치 오차에 따른 Fusion 성능 변화 확인 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

---

## 8. 배포 최적화 결과

### DEP-EXP-01

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | ONNX 변환 검증 |
| 비교 대상 | PyTorch FP32 / ONNX FP32 |
| 고정 조건 | 최종 후보 모델, 최종 입력 해상도 |
| 핵심 지표 | 출력 일치성 |
| 결과 및 계산 기준 | 변환 전후 bbox, class, confidence 결과 차이 확인 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### DEP-EXP-02

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | ONNX Runtime CPU 추론 |
| 비교 대상 | PyTorch 직접 추론 / ONNX Runtime CPU |
| 고정 조건 | batch size 1 |
| 핵심 지표 | CPU 추론 시간 |
| 결과 및 계산 기준 | 단건 이미지 또는 pair 입력 기준 평균 추론 시간 측정 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### DEP-EXP-03

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | INT8 양자화 비교 |
| 비교 대상 | ONNX FP32 / ONNX INT8 |
| 고정 조건 | validation 일부를 calibration dataset으로 사용 |
| 핵심 지표 | 정확도 손실 |
| 결과 및 계산 기준 | ONNX FP32 대비 ONNX INT8 성능 감소와 추론 시간·모델 크기 개선 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### DEP-EXP-04

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | 입력 유형별 추론 비교 |
| 비교 대상 | RGB 단일 / Thermal 단일 / RGB-Thermal pair |
| 고정 조건 | 최종 후보 모델 |
| 핵심 지표 | 추론 시간, 결과 안정성 |
| 결과 및 계산 기준 | 입력 유형별 추론 시간과 bbox/class/confidence 안정성 확인 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### DEP-EXP-05

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | 모델 크기 비교 |
| 비교 대상 | RGB-only / Thermal-only / Fusion 모델 |
| 고정 조건 | 최종 후보 모델 파일 |
| 핵심 지표 | 모델 크기 |
| 결과 및 계산 기준 | PyTorch FP32, ONNX FP32, ONNX INT8 모델 파일 크기 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

---

# 실험 결과 아카이브

## 1. 목적

모델·데이터 실험 결과를 실험 ID 기준으로 누적 관리

각 실험에서 무엇을 비교했는지, 어떤 지표와 계산 기준으로 판단했는지, 최종적으로 어떤 방식을 선택했는지 기록

---

## 2. 기록 방식

각 실험은 하나의 피드 단위로 작성한다.

| 항목 | 설명 |
| --- | --- |
| 실험 ID | 실험을 구분하는 고유 ID |
| 비교 대상 | 해당 실험에서 비교한 데이터셋, 모델, 합성 방식, 해상도, 배포 형식 등 |
| 고정 조건 | 실험 중 변경하지 않은 기준 config |
| 핵심 지표 | 최종 판단에 우선 사용하는 지표 |
| 결과 및 계산 기준 | 실험 결과값과 해당 지표를 계산한 기준 |
| 최종 선택 | 실험 결과에 따라 선택한 방식 |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 | 모델 파일, 로그, 시각화 결과, heatmap, ONNX 파일 경로 |
| 메모 | 결과 해석, 문제점, 다음 조치 |

---

## 3. 실험 결과 피드 템플릿

### `{실험 ID}`

| 항목 | 내용 |
| --- | --- |
| 실험 구분 |  |
| 비교 대상 |  |
| 고정 조건 |  |
| 핵심 지표 |  |
| 결과 및 계산 기준 |  |
| 최종 선택 |  |
| 판정 | 채택 / 보류 / 제외 |
| 산출물 |  |
| 메모 |  |

---

## 4. Synthetic Defect 생성 결과

### SYN-EXP-01

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Rule-based 합성 |
| 비교 대상 | OpenCV 기반 RGB 결함 overlay / Gaussian hotspot / thermal intensity 증가 |
| 고정 조건 | 정상 RGB-Thermal panel crop pair |
| 핵심 지표 | 라벨 정확성 |
| 결과 및 계산 기준 | RGB mask와 Thermal bbox 기준 bbox, mask, class, severity 자동 생성 결과 확인 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### SYN-EXP-02

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | GAN 합성 |
| 비교 대상 | Pix2Pix / CycleGAN / Conditional GAN |
| 고정 조건 | 정상 RGB-Thermal panel crop pair |
| 핵심 지표 | 결함 현실감 |
| 결과 및 계산 기준 | 생성 이미지 품질과 RGB mask / Thermal bbox 기반 bbox, mask, class 매핑 가능성 확인 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### SYN-EXP-03

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Diffusion Inpainting |
| 비교 대상 | Stable Diffusion Inpainting / ControlNet / LoRA fine-tuning |
| 고정 조건 | 정상 RGB-Thermal panel crop pair |
| 핵심 지표 | 결함 현실감 |
| 결과 및 계산 기준 | mask 영역 생성 품질과 RGB mask / Thermal bbox 유지 여부 확인 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### SYN-EXP-04

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Rule-based + Diffusion |
| 비교 대상 | Rule-based mask 생성 + Diffusion texture 보정 |
| 고정 조건 | 정상 RGB-Thermal panel crop pair |
| 핵심 지표 | 라벨 정확성 + 결함 현실감 |
| 결과 및 계산 기준 | rule-based mask/bbox 유지 여부와 diffusion 보정 후 이미지 품질 확인 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

---

## 5. Anomalib 품질 검증 결과

### ANO-EXP-01

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | RGB anomaly 검증 |
| 비교 대상 | RGB anomaly heatmap / generator mask·bbox |
| 고정 조건 | 정상 RGB crop memory bank |
| 핵심 지표 | Mask-Heatmap 일치도 |
| 결과 및 계산 기준 | RGB synthetic defect 영역과 anomaly heatmap 반응 영역 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### ANO-EXP-02

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Thermal anomaly 검증 |
| 비교 대상 | Thermal anomaly heatmap / generator mask·bbox |
| 고정 조건 | 정상 Thermal crop memory bank |
| 핵심 지표 | Mask-Heatmap 일치도 |
| 결과 및 계산 기준 | Thermal synthetic defect 영역과 anomaly heatmap 반응 영역 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### ANO-EXP-03

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Normal 반응 검증 |
| 비교 대상 | 정상 RGB crop / 정상 Thermal crop |
| 고정 조건 | 정상 crop memory bank |
| 핵심 지표 | 정상 오탐 여부 |
| 결과 및 계산 기준 | 정상 crop에서 anomaly 반응이 과도하게 발생하는지 확인 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### ANO-EXP-04

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Pair sample 검증 |
| 비교 대상 | synthetic RGB-Thermal crop pair |
| 고정 조건 | RGB/Thermal 모달별 memory bank |
| 핵심 지표 | 모달별 반응 일치 |
| 결과 및 계산 기준 | RGB와 Thermal 각각의 heatmap이 각 모달의 generator mask/bbox와 맞는지 확인 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

---

## 6. RGB 단건 분석 결과

### RGB-EXP-01

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | RGB 데이터셋 구성 비교 |
| 비교 대상 | New Solar Panel RGB Faults / synthetic RGB defect dataset / 공개+synthetic 혼합 |
| 고정 조건 | YOLOv8s-seg 또는 YOLOv8s, 640×640, epoch 100 |
| 핵심 지표 | Recall, F1-score |
| 결과 및 계산 기준 | test set에서 정답 mask/bbox/class와 예측 mask/bbox/class 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### RGB-EXP-02

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | RGB 모델 구조 비교 |
| 비교 대상 | YOLOv8n-seg / YOLOv8s-seg 또는 YOLOv8n / YOLOv8s |
| 고정 조건 | RGB-EXP-01 선정 데이터셋, 640×640 |
| 핵심 지표 | Recall, F1-score, 추론 시간 |
| 결과 및 계산 기준 | 동일 test set에서 모델별 탐지 성능과 추론 시간 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### RGB-EXP-03

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | RGB 입력 해상도 비교 |
| 비교 대상 | 512×512 / 640×640 / 768×768 |
| 고정 조건 | RGB-EXP-02 선정 모델 |
| 핵심 지표 | Recall, F1-score, 추론 시간 |
| 결과 및 계산 기준 | 해상도별 탐지 성능과 추론 시간 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### RGB-EXP-04

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | RGB Augmentation 비교 |
| 비교 대상 | 기본 증강 / 강한 증강 |
| 고정 조건 | RGB 선정 데이터셋, 선정 모델, 선정 해상도 |
| 핵심 지표 | F1-score |
| 결과 및 계산 기준 | 증강 강도별 일반화 성능 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### RGB-EXP-05

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | RGB Threshold 비교 |
| 비교 대상 | confidence threshold / NMS IoU |
| 고정 조건 | RGB 선정 데이터셋, 선정 모델, 선정 해상도 |
| 핵심 지표 | Precision, Recall |
| 결과 및 계산 기준 | threshold 변경에 따른 오탐·미탐 변화 확인 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

---

## 7. 열화상 단건 분석 결과

### TH-EXP-01

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Thermal 데이터셋 구성 비교 |
| 비교 대상 | ThermoSolar-PV / synthetic Thermal defect dataset / 공개+synthetic 혼합 |
| 고정 조건 | YOLOv8s, 640×640, epoch 100 |
| 핵심 지표 | Recall, F1-score |
| 결과 및 계산 기준 | test set에서 정답 bbox/class와 예측 bbox/class 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### TH-EXP-02

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Thermal 모델 구조 비교 |
| 비교 대상 | YOLOv8n / YOLOv8s |
| 고정 조건 | TH-EXP-01 선정 데이터 구성, 640×640 |
| 핵심 지표 | Recall, F1-score, 추론 시간 |
| 결과 및 계산 기준 | 동일 test set에서 모델별 탐지 성능과 추론 시간 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### TH-EXP-03

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Thermal 입력 해상도 비교 |
| 비교 대상 | 512×512 / 640×640 / 768×768 |
| 고정 조건 | TH-EXP-02 선정 모델 |
| 핵심 지표 | Recall, F1-score, 추론 시간 |
| 결과 및 계산 기준 | 해상도별 탐지 성능과 추론 시간 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### TH-EXP-04

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Thermal Augmentation 비교 |
| 비교 대상 | 기본 증강 / 강한 증강 |
| 고정 조건 | Thermal 선정 데이터셋, 선정 모델, 선정 해상도 |
| 핵심 지표 | F1-score |
| 결과 및 계산 기준 | 증강 강도별 일반화 성능 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### TH-EXP-05

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Thermal Threshold 비교 |
| 비교 대상 | confidence threshold / NMS IoU |
| 고정 조건 | Thermal 선정 데이터셋, 선정 모델, 선정 해상도 |
| 핵심 지표 | Precision, Recall |
| 결과 및 계산 기준 | threshold 변경에 따른 오탐·미탐 변화 확인 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

---

## 8. RGB-Thermal Fusion 분석 결과

### FUS-EXP-01

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | 입력 구성 비교 |
| 비교 대상 | RGB-only / Thermal-only / RGB-Thermal Fusion |
| 고정 조건 | 동일 test split |
| 핵심 지표 | Fusion 개선 효과 |
| 결과 및 계산 기준 | 동일 test split에서 단일 모달 최고 성능 대비 Fusion 성능 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### FUS-EXP-02

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Fusion 방식 비교 |
| 비교 대상 | Early Fusion / Late Fusion |
| 고정 조건 | synthetic RGB-Thermal paired dataset |
| 핵심 지표 | Fusion 개선 효과, 추론 시간 |
| 결과 및 계산 기준 | Early Fusion과 Late Fusion의 성능·구현 안정성 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### FUS-EXP-03

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | 결과 결합 방식 비교 |
| 비교 대상 | confidence score 결합 / NMS IoU / weighted score fusion |
| 고정 조건 | Late Fusion |
| 핵심 지표 | F1-score |
| 결과 및 계산 기준 | 결과 결합 방식별 오탐·미탐 변화 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### FUS-EXP-04

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Fusion 입력 해상도 비교 |
| 비교 대상 | 512×512 / 640×640 / 768×768 |
| 고정 조건 | 선정 Fusion 방식 |
| 핵심 지표 | Recall, F1-score, 추론 시간 |
| 결과 및 계산 기준 | 해상도별 Fusion 성능과 추론 시간 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### FUS-EXP-05

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | Pair 정합성 비교 |
| 비교 대상 | 정합이 좋은 pair / 위치 오차가 있는 pair |
| 고정 조건 | 선정 Fusion 모델 |
| 핵심 지표 | 성능 저하 폭 |
| 결과 및 계산 기준 | pair 위치 오차에 따른 Fusion 성능 변화 확인 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

---

## 9. 배포 최적화 결과

### DEP-EXP-01

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | ONNX 변환 검증 |
| 비교 대상 | PyTorch FP32 / ONNX FP32 |
| 고정 조건 | 최종 후보 모델, 최종 입력 해상도 |
| 핵심 지표 | 출력 일치성 |
| 결과 및 계산 기준 | 변환 전후 bbox, mask, class, confidence 결과 차이 확인 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### DEP-EXP-02

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | ONNX Runtime CPU 추론 |
| 비교 대상 | PyTorch 직접 추론 / ONNX Runtime CPU |
| 고정 조건 | batch size 1 |
| 핵심 지표 | CPU 추론 시간 |
| 결과 및 계산 기준 | 단건 이미지 또는 pair 입력 기준 평균 추론 시간 측정 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### DEP-EXP-03

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | INT8 양자화 비교 |
| 비교 대상 | ONNX FP32 / ONNX INT8 |
| 고정 조건 | validation 일부를 calibration dataset으로 사용 |
| 핵심 지표 | 정확도 손실 |
| 결과 및 계산 기준 | ONNX FP32 대비 ONNX INT8 성능 감소와 추론 시간·모델 크기 개선 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### DEP-EXP-04

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | 입력 유형별 추론 비교 |
| 비교 대상 | RGB 단일 / Thermal 단일 / RGB-Thermal pair |
| 고정 조건 | 최종 후보 모델 |
| 핵심 지표 | 추론 시간, 결과 안정성 |
| 결과 및 계산 기준 | 입력 유형별 추론 시간과 bbox/mask/class/confidence 안정성 확인 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

### DEP-EXP-05

| 항목 | 내용 |
| --- | --- |
| 실험 구분 | 모델 크기 비교 |
| 비교 대상 | RGB-only / Thermal-only / Fusion 모델 |
| 고정 조건 | 최종 후보 모델 파일 |
| 핵심 지표 | 모델 크기 |
| 결과 및 계산 기준 | PyTorch FP32, ONNX FP32, ONNX INT8 모델 파일 크기 비교 |
| 최종 선택 |  |
| 판정 |  |
| 산출물 |  |
| 메모 |  |

---

## 10. 판정 기준

| 판정 | 기준 |
| --- | --- |
| 채택 | 핵심 지표가 기준을 만족하고, 다음 실험 또는 배포 후보로 사용할 수 있는 경우 |
| 보류 | 성능은 일부 확인되었지만 추가 실험이나 보정이 필요한 경우 |
| 제외 | 성능 개선이 없거나 결과가 불안정해 후속 실험에 사용하지 않는 경우 |

