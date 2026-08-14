# AI Worker Scaling Benchmark

## Environment
- AWS EC2 t3.large
- K3s
- 100 Jobs per test
- RGB / Thermal 별도 측정

## Cases
1. 1 EC2 / 1 Worker
2. 1 EC2 / 2 Workers
3. 2 EC2 / 2 Workers

## Summary
| Case | RGB Throughput | Thermal Throughput |
| ... |

## Conclusion
동일 Node에서 Worker만 복제했을 때 CPU 경합으로 확장 효과가 제한되었고,
Worker를 별도 EC2 Node로 분산했을 때 처리량이 크게 개선됨.

## Raw Results
각 benchmark screenshot
