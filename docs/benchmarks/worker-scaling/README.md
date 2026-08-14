# AI Worker Scaling Benchmark

## Environment
- AWS EC2 t3.large
- K3s
- 동일 100 Jobs 기준
- RGB / Thermal 각각 측정

## Cases
1. 1 EC2 / 1 Worker
2. 1 EC2 / 2 Workers
3. 2 EC2 / 2 Workers

## Results

| 구성 | RGB 처리시간 | RGB Throughput | Thermal 처리시간 | Thermal Throughput |
|---|---:|---:|---:|---:|
| 1 EC2 / 1 Worker | 271.40s | 0.368 jobs/s | 80.19s | 1.247 jobs/s |
| 1 EC2 / 2 Workers | 251.35s | 0.398 jobs/s | 65.43s | 1.528 jobs/s |
| 2 EC2 / 2 Workers | 127.19s | 0.786 jobs/s | 39.21s | 2.550 jobs/s |

## Key Findings
- 동일 EC2에서 Worker 1→2: RGB 처리량 +8.2%
- 이때 평균 RGB 추론시간 2.45s → 4.60s, Node CPU Peak 99%
- 2 EC2 / 2 Workers: RGB 처리량 +113.6%
- 2 EC2 / 2 Workers: Thermal 처리량 +104.5%

## Conclusion
동일 Node에서 Worker만 늘릴 경우 CPU 경합으로 확장 효과가 제한되었다.
따라서 CPU 추론 부하가 증가할 때는 Worker Pod만 복제하기보다
EC2(Node)를 증설해 Worker를 분산하는 방향으로 결정했다.

## Raw Results
- [RGB — 1 EC2 / 1 Worker](...)
- [RGB — 1 EC2 / 2 Workers](...)
- [RGB — 2 EC2 / 2 Workers](...)
- [Thermal — 1 EC2 / 1 Worker](...)
- [Thermal — 1 EC2 / 2 Workers](...)
- [Thermal — 2 EC2 / 2 Workers](...)
