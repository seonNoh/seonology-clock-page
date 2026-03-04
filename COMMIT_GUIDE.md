# 커밋 가이드 — seonology-clock-page 기능 추가 내역

아래 순서대로 나눠서 커밋하면 됩니다.

---

## 1. feat: 눈 효과 크리스탈 + 쉬머 (CursorCanvas)
**파일:** `src/components/CursorCanvas.jsx`
- 기존 원형(arc) 눈 파티클 → 6가지 가지(branch) 눈꽃 크리스탈로 변경
- 각 파티클에 회전(wobble) 적용
- 랜덤 shimmer 효과: `sin(shimmer) > 0.85`일 때 radial gradient 글로우 아우라 표시
- shimmerSpeed 0.02~0.06 랜덤

---

## 2. feat: 날짜 텍스트 쉬머 + 십자 플레어 효과 (Clock.css)
**파일:** `src/components/Clock.css`
- DATE TEXT SHIMMER EFFECT 섹션 추가 (파일 하단)
- `background-clip: text` + `background-position` 애니메이션으로 sweep 효과
- 3가지 색상 변형: white(기본), cyan(neon-date), green(matrix-date)
- `::before`(수평 ray) + `::after`(수직 ray) pseudo-element로 십자형 빛줄기 플레어
- radial-gradient 기반, 8초 주기에서 90-100%에 나타남
- 플레어 위치: 우상단 (right: 0, top: 0)

---

## 3. feat: 마크다운 프리뷰 모달 추가
**파일:**
- `src/components/MarkdownPreview.jsx` (신규)
- `src/components/MarkdownPreview.css` (신규)
- `src/App.jsx` (import, state, ESC, render)

**기능:**
- 풀스크린 모달 (92vw × 88vh)
- 좌측 에디터 + 우측 프리뷰 분할 뷰
- 스크롤 동기화, Tab 키 지원, wordWrap 토글
- Copy / Clear 버튼
- localStorage 자동저장 (debounce 500ms)
- `src/utils/markdown.js`의 renderMarkdown() 사용

---

## 4. feat: 마크다운 프리뷰 뷰 모드 토글 (Split / Preview Only)
**파일:**
- `src/components/MarkdownPreview.jsx`
- `src/components/MarkdownPreview.css`

**기능:**
- viewMode state: 'split' | 'preview'
- 헤더에 토글 버튼 2개 (split 아이콘 / 문서 아이콘)
- Preview Only 모드: 에디터 숨기고 렌더링만 전체 표시 (max-width: 860px 중앙정렬)
- wordWrap 버튼은 split 모드에서만 표시

---

## 5. feat: 하단 버튼 → 모바일 앱 아이콘 그리드 UI 개편
**파일:**
- `src/App.jsx` (bottom-right-stack → app-icon-grid 구조 변경)
- `src/App.css` (app-icon-grid, app-icon-btn, app-icon-visual, app-icon-label 스타일)

**기능:**
- 3열 그리드 레이아웃 (grid-template-columns: repeat(3, 1fr))
- 50×50px 둥근 사각형 아이콘 (border-radius: 14px)
- 유리모핑 배경, hover 확대 + 밝아지는 효과
- 아이콘 아래 작은 라벨 텍스트

---

## 6. feat: 단위 변환 도구 (Unit Converter) 추가
**파일:**
- `src/components/UnitConverter.jsx` (신규)
- `src/components/UnitConverter.css` (신규)
- `src/App.jsx` (import, state, ESC, app-icon 버튼, render)

**기능:**
- 15개 카테고리: Length, Weight, Temperature, Area, Volume, Speed, Time, Digital Storage, Pressure, Energy, Power, Frequency, Angle, Fuel Economy, Cooking
- 한국 전통 단위 포함 (리, 척, 근, 돈, 냥, 평, 단보, 정보, 되, 말)
- SVG 아이콘 (이모지 → SVG 변환 완료)
- 양방향 실시간 변환, 스왑 버튼
- Quick Reference 테이블 (클릭 시 값 입력)
- 온도/연비 특수 변환 로직
- 카테고리별 상태 독립 유지

---

## 7. feat: Base64 Encode/Decode 도구 추가
**파일:**
- `src/components/Base64Tool.jsx` (신규)
- `src/components/Base64Tool.css` (신규)
- `src/App.jsx` (import, state, ESC, app-icon 버튼, render)

**기능:**
- Encode/Decode 모드 토글
- 유니코드(한글 등) 정상 지원
- 파일→Base64 인코딩 (이미지/파일 업로드)
- Base64→파일 다운로드 (Decode 모드)
- Swap (입출력 뒤집기 + 모드 자동 전환)
- Paste / Copy / Clear 버튼
- 입출력 통계 (문자 수, 크기 증가율)

---

## 8. feat: JSON Formatter/Validator 도구 추가
**파일:**
- `src/components/JsonFormatter.jsx` (신규)
- `src/components/JsonFormatter.css` (신규)
- `src/App.jsx` (import, state, ESC, app-icon 버튼, render)

**기능:**
- JSON 파싱, 포맷팅 (indent 2/4/Tab)
- Minify, Sort Keys
- 구문 하이라이팅 (문자열, 숫자, boolean, null, key 색상 구분)
- 라인 넘버 표시
- JSON 경로 검색
- 에러 발생 시 line/col 위치 표시
- 통계: type, keys, values, depth, size

---

## 9. feat: IP Address Lookup 도구 추가
**파일:**
- `src/components/IpLookup.jsx` (신규)
- `src/components/IpLookup.css` (신규)
- `src/App.jsx` (import, state, ESC, app-icon 버튼, render)

**기능:**
- 내 공인 IP 자동 조회 (ipapi.co 무료 API)
- 임의 IP/도메인 검색
- 지리 정보 표시: 국가, 지역, 도시, 우편번호, 위도/경도, 타임존
- ISP/Organization/AS 정보
- Google Maps 연동 링크
- 각 필드 클릭 시 복사 / 전체 복사
- 조회 히스토리 (최대 10개, localStorage 저장)
- 반응형 레이아웃 (모바일 대응)

---

## 10. feat: Password Generator 도구 추가
**파일:**
- `src/components/PasswordGenerator.jsx` (신규)
- `src/components/PasswordGenerator.css` (신규)
- `src/App.jsx` (import, state, ESC, app-icon 버튼, render)

**기능:**
- Random / Passphrase 2가지 모드
- 길이 슬라이더 (4~128자) + 직접 입력
- 문자 종류 토글: 대문자, 소문자, 숫자, 특수문자
- Quick Preset: PIN(4), Simple(8), Strong(16), Ultra(32), Passphrase
- 강도 미터: 5단계 시각 표시 + 엔트로피(bits) 계산
- Passphrase 모드: 단어 수(2~10), 구분자(-. _ 공백 없음) 선택
- 고급 옵션: 유사 문자 제외 (0OoIl1|), 커스텀 특수문자
- crypto.getRandomValues() 기반 보안 랜덤
- 각 카테고리 최소 1자 보장
- Copy / Regenerate 버튼
- 생성 히스토리 (최대 20개, localStorage 저장, 클릭 복사)
- 반응형 레이아웃 (모바일 대응)

---

## 11. feat: Color Picker & Converter 도구 추가
**파일:**
- `src/components/ColorPicker.jsx` (신규)
- `src/components/ColorPicker.css` (신규)
- `src/App.jsx` (import, state, ESC, app-icon 버튼, render)

**기능:**
- SV(채도/명도) Canvas 피커 + Hue 바 + Alpha 슬라이더
- 마우스 드래그로 실시간 색상 선택
- EyeDropper API 스포이드 (Chrome/Edge — 브라우저 밖 전체 화면 가능)
- 5가지 포맷 변환: HEX, RGB(A), HSL(A), HSV, CMYK
- 각 포맷 클릭 복사
- RGB 직접 입력 (R/G/B 슬라이더) + HEX 직접 입력
- CSS 색상 파서: hex, rgb(), hsl(), CSS named color 입력 파싱
- WCAG 대비율 표시: White/Black 대비 + AA/AAA 판정
- Color Harmony: Complementary, Analogous, Triadic, Split-Comp, Tetradic
- 하모니 색상 클릭 시 바로 적용
- 팔레트 저장 (최대 32색, 우클릭 삭제, localStorage)
- 최근 사용 색상 히스토리 (최대 24색)
- Random 색상 생성 버튼
- 반응형 레이아웃 (모바일 대응)

---

## 12. feat: Cron Job Editor 도구 추가
**파일:**
- `src/components/CronEditor.jsx` (신규)
- `src/components/CronEditor.css` (신규)
- `src/App.jsx` (import, state, ESC, app-icon 버튼, render)

**기능:**
- 여러 cron 식 동시 관리 (사이드바 리스트, 추가/복제/삭제)
- 표준 5-field (minute, hour, day-of-month, month, day-of-week) 지원
- 6-field 확장 (seconds 포함) 토글
- 시각적 필드 편집기: 아코디언 UI로 각 필드 펼쳐서 값 선택
  - Quick 버튼 (Every, */2, */5, */10, */15, */30)
  - 값 그리드로 개별 값 토글 선택 (요일명/월명 표시)
  - Custom 직접 입력
- 실시간 유효성 검증 (범위 체크, 토큰 파싱)
- Human-readable 설명 자동 생성
- Next 5 Runs: 다음 실행 시간 날짜/시간 + 상대 시간 표시
- 12개 Quick Presets (매분, 매5분, 매시, 매일, 주중 등)
- Cron Syntax Reference 치트시트 (접이식)
- 이름 지정 및 localStorage 자동 저장
- Copy 버튼 (클립보드)
- 반응형 레이아웃 (모바일: 사이드바 가로 스크롤)

---

## 13. feat: CIDR / Subnet Visualizer 도구 추가
**파일:**
- `src/components/SubnetVisualizer.jsx` (신규)
- `src/components/SubnetVisualizer.css` (신규)
- `src/App.jsx` (import, state, ESC, app-icon 버튼, render)

**기능:**
- VPC/Supernet CIDR 입력 → 전체 주소 공간 시각화
- 서브넷 CIDR 추가/수정/삭제, 이름 지정 인라인 편집
- Address Space Map: VPC 범위 내 서브넷 비례 블록 시각 배치
  - 색상 코딩, hover/select 인터랙션
  - 스케일 마커 (IP 주소 눈금)
- 사용률 프로그레스 바 (Used / Total IPs, %)
- Subnet Blocks 카드 그리드: 이름, CIDR, IP 수, VPC 내 점유율
- 서브넷 겹침(overlap) 자동 감지 + 경고
- VPC 외부 서브넷 감지 (Outside 표시)
- 서브넷 상세 패널: Network, Broadcast, Mask, Wildcard, Usable range, Total/Usable/AWS Usable IPs
  - 클릭으로 값 복사
  - AWS Reserved IPs 목록 (Network, VPC Router, DNS, Future, Broadcast)
- Available Ranges: 빈 공간 목록 표시
- Auto Split: VPC를 2/4/8/16/32/64 등분 자동 분할
- 4개 Presets: AWS Basic 2AZ, AWS 3-Tier 3AZ, Small Office, K8s Cluster
- localStorage 자동 저장
- 반응형 레이아웃 (모바일 대응)

---

## 14. feat: SLO / SLI Calculator 도구 추가
**파일:**
- `src/components/SloCalculator.jsx` (신규)
- `src/components/SloCalculator.css` (신규)
- `src/App.jsx` (import, state, ESC, app-icon 버튼, render)

**기능:**
- SLO 타겟 입력 (0~100%, 소수점 지원) + 7가지 Quick 프리셋 (99%~99.9999%)
- Nines 배지 + 티어 색상 (Low/Standard/High/Critical/Extreme)
- Time Window 선택 (Day, Week, Month, Quarter, Year)
- Error Budget 대형 디스플레이: 허용 다운타임 시간 즉시 표시
  - 비주얼 budget bar (Uptime % vs Error Budget %)
- Error Budget by Time Window: 모든 기간별 허용 다운타임 카드 그리드
- Reverse Calculator: 다운타임 분 입력 → 해당 SLO % 역산
- Composite SLO: 다중 의존성(서비스) SLO 곱셈 계산
  - 서비스 추가/삭제/이름·SLO 편집
  - 결합 SLO 및 Error Budget 실시간 표시
- SLI Quick Tracker: Total/Good requests 입력 → SLI 비율 계산
  - 4가지 SLI 유형 (Availability, Latency, Error Rate, Throughput)
  - SLO 대비 Within/Burning 상태 표시
  - 히스토리 기록 (최대 30개, localStorage)
- SLO Reference Table: 일반적 SLO 목표별 월/연 다운타임 비교표
- Copy 버튼 (클립보드)
- localStorage 자동 저장
- 반응형 레이아웃 (모바일 대응)

---

## 15. feat: CI/CD Pipeline Visualizer 도구 추가
**파일:**
- `src/components/CiCdVisualizer.jsx` (신규)
- `src/components/CiCdVisualizer.css` (신규)
- `src/App.jsx` (import, state, ESC, app-icon 버튼, render)

**기능:**
- GitHub Actions / GitLab CI 두 플랫폼 지원 (탭 전환)
- YAML 텍스트 에디터 내장 + 실시간 자동 파싱 (400ms debounce)
- 내장 샘플 YAML (GitHub 5-job pipeline, GitLab 7-job pipeline)
- 커스텀 간이 YAML 파서 (외부 라이브러리 무의존)
- **Pipeline DAG 시각화:**
  - 토폴로지 정렬 기반 레이어 배치 (의존성 방향 좌→우)
  - SVG Bezier 곡선 화살표 (dependency edges)
  - 마우스 hover 시 관련 edge 하이라이트 + glow 필터
  - 노드 클릭 → 좌측 패널에 Job 상세 정보 표시
- **GitHub Actions 파싱:**
  - workflow name, on triggers, jobs, needs, runs-on, environment, steps
  - Step별 name / uses / run 표시
- **GitLab CI 파싱:**
  - stages, jobs, stage, image, needs, script, environment, when, allow_failure, artifacts
  - Stage 색상 태그 + 스크립트 명령어 표시
- Job 상세 패널: 환경, runner, dependencies, steps/script 전체 표시
- Stats 바: Jobs 수, Stages/Layers 수, Triggers 수, Manual 게이트 수
- 배지: manual (노란색), allow_failure (주황색), environment (녹색)
- Legend: Dependency, Manual gate, Environment, Allow failure
- Clear / Reset Sample 버튼
- 반응형 레이아웃 (모바일 세로 스택)

---

## 16. feat: Excel → Markdown Table 변환 도구 추가
**파일:**
- `src/components/ExcelToMarkdown.jsx` (신규)
- `src/components/ExcelToMarkdown.css` (신규)
- `src/App.jsx` (import, state, ESC, app-icon 버튼, render)

**기능:**
- Excel / Google Sheets 클립보드 붙여넣기 → Markdown 테이블 자동 변환
- TSV / CSV 텍스트 직접 입력 지원
- Auto 포맷 감지 (탭 vs 콤마 카운트 비교)
- **출력 포맷 선택:** Markdown Table / HTML Table
- **Markdown 옵션:**
  - 정렬: Left / Center / Right (separator 행에 반영)
  - Compact 모드 (패딩 제거)
  - Column 너비 자동 정렬 (최대 셀 길이 기준)
- 파이프(|) 문자 자동 이스케이프
- First Row as Header 토글
- Trim Cells 토글
- CSV 파서: 따옴표 내 콤마/줄바꿈/이스케이프 처리
- **테이블 프리뷰:** 변환 결과를 실제 HTML 테이블로 시각화
- 클립보드 Copy 버튼 + 복사 히스토리 (최근 10건)
- Stats 바: rows × cols × 감지된 포맷
- Sample TSV / Sample CSV 내장
- Clear 버튼
- 반응형 레이아웃 (모바일 세로 스택)

---

## 17. feat: RBAC Visualizer (K8s/Cloud) 도구 추가
**파일:**
- `src/components/RbacVisualizer.jsx` (신규)
- `src/components/RbacVisualizer.css` (신규)
- `src/App.jsx` (import, state, ESC, app-icon 버튼, render)

**기능:**
- K8s RBAC YAML 입력 (Role, ClusterRole, RoleBinding, ClusterRoleBinding)
- 커스텀 간이 YAML 파서 (외부 라이브러리 무의존, K8s RBAC subset 지원)
- `---` 기준 다중 문서 파싱
- **DAG 그래프 시각화:**
  - 3-layer 레이아웃: Subjects → Bindings → Roles (좌→우)
  - SVG Bezier 곡선 화살표 (binding 관계)
  - 노드 hover 시 연결된 전체 경로 BFS 하이라이트 + glow
  - 비연결 노드/엣지 자동 dimming
- **노드 타입별 색상:**
  - User (인디고), Group (보라), ServiceAccount (스카이블루)
  - RoleBinding (노랑), ClusterRoleBinding (주황)
  - Role (에메랄드), ClusterRole (틸)
- 노드 클릭 → 상세 패널:
  - 타입 배지, 네임스페이스, 연결 노드 목록 (클릭 탐색)
  - Role: Rules 카드 (resources, verbs, apiGroups)
  - Subject: **Effective Permissions** — binding chain 추적하여 실제 권한 종합 표시
- **Verb 색상 코딩:** get/list/watch (녹), create (파랑), update/patch (노랑), delete (빨강), * (보라)
- 검색 필터: 노드 이름/타입 검색
- 타입 필터: All / Subjects / Bindings / Roles
- 미정의 Role 참조 시 ? 마크 표시
- Stats 바: Subjects, Bindings, Roles 카운트
- 내장 샘플 YAML (4 Role + 4 Binding, 5 Subject)
- Legend: 7가지 노드 타입 + Binding 엣지
- 반응형 레이아웃 (모바일 세로 스택)

---

## 커밋 18: Terraform State Parser 기능 추가

**파일:**
- `src/components/TerraformParser.jsx` (신규)
- `src/components/TerraformParser.css` (신규)
- `src/App.jsx` (import, state, ESC, app-icon 버튼, render)

**기능:**
- `terraform.tfstate` (v4) JSON 파싱 및 분석
- **메타데이터 표시:** Terraform 버전, State 버전, Serial #, 리소스 수, Output 수
- **Outputs 패널:** sensitive 값 마스킹, 타입 표시
- **3가지 뷰 모드:**
  - **List:** 리소스 카드 (주소, ID, 태그, 의존성 링크, 클릭 시 속성 JSON 확장)
  - **Graph:** 의존 관계 DAG 시각화 (위상 정렬 레이어, SVG Bezier 엣지 + 화살표)
  - **Table:** 리소스 표 (Type, Address, ID, Provider, Deps)
- **리소스 카테고리 자동 분류 + 색상:**
  - Compute (오렌지), Network (파랑), Storage (보라), Database (에메랄드)
  - IAM (노랑), DNS (시안), Monitoring (핑크), Data Source (슬레이트)
- 카테고리 칩 필터 (클릭 토글)
- 검색 필터: 리소스 주소, ID, 태그 값 검색
- 의존성 링크 클릭 → 해당 리소스 선택
- 속성 JSON 복사 버튼
- 내장 샘플 tfstate (AWS VPC, Subnet, SG, EC2, RDS, S3, AMI data source)
- Legend: 8가지 리소스 카테고리
- 반응형 레이아웃 (모바일 세로 스택)
- glassmorphism 다크 테마 모달

---

## 커밋 19: GitLab CI → GitHub Actions Converter 기능 추가

**파일:**
- `src/components/GitlabToGithub.jsx` (신규)
- `src/components/GitlabToGithub.css` (신규)
- `src/App.jsx` (import, state, ESC, app-icon 버튼, render)

**기능:**
- `.gitlab-ci.yml` YAML 입력 → `.github/workflows/ci.yml` 자동 변환
- 커스텀 간이 YAML 파서 (외부 라이브러리 무의존, CI/CD subset 지원)
- **변환 항목:**
  - `stages` + `needs` → GitHub `jobs` + `needs` 의존 관계
  - `image` → `container` 설정
  - `script/before_script/after_script` → `steps[].run`
  - `artifacts` → `actions/upload-artifact@v4` (expire_in → retention-days)
  - `cache` → `actions/cache@v4` (paths, key 매핑)
  - `services` → `services` 컨테이너
  - `only/except` + `rules` → `if` 조건 + `on` 이벤트 필터
  - `variables` → `env` (글로벌 + Job-level)
  - `environment` → `environment` (name, url)
  - `allow_failure` → `continue-on-error`
  - `when: manual` → 경고 + 코멘트 (workflow_dispatch 권장)
  - `coverage` → info 메시지 (coverage action 권장)
- **GitLab → GitHub 변수 자동 매핑:**
  - `$CI_COMMIT_REF_NAME` → `github.ref_name`
  - `$CI_COMMIT_SHA` → `github.sha`
  - `$CI_PIPELINE_ID` → `github.run_id`
  - `$CI_PROJECT_PATH` → `github.repository`
  - `$CI_REGISTRY_IMAGE` → `ghcr.io/...` 등 11종
- **3탭 UI:**
  - **Output:** 변환된 GitHub Actions YAML + 복사 버튼
  - **Variables:** GitLab CI ↔ GitHub Actions 변수 매핑 레퍼런스 테이블
  - **Concepts:** 개념 매핑 레퍼런스 (stages↔jobs, artifacts↔upload-artifact 등 16항목)
- Stats 바: Stages, Jobs, Warnings, Info 카운트
- 경고/정보 메시지 패널 (allow_failure, services, coverage 등)
- 내장 샘플 `.gitlab-ci.yml` (install, lint, test, build, deploy 5-stage 파이프라인)
- 반응형 레이아웃 (모바일 세로 스택)
- glassmorphism 다크 테마 모달 (GitLab 오렌지 + GitHub 블루 컬러 코딩)

## 커밋 20: Architecture Icon Search & Downloader 기능 추가

### 변경 파일
- `src/components/ArchIconSearch.jsx` (신규)
- `src/components/ArchIconSearch.css` (신규)
- `src/App.jsx` (수정 — import, state, ESC, 아이콘 버튼, 렌더)

### 주요 내용
- **아키텍처 다이어그램용 아이콘 검색 & 다운로드 도구**
- 총 56개 내장 SVG 아이콘 (외부 의존성 없음)
- **9개 카테고리:**
  - AWS (14): EC2, S3, RDS, Lambda, VPC, ELB, CloudFront, IAM, Route 53, ECS, EKS, SQS, SNS, DynamoDB
  - GCP (6): Compute Engine, Cloud Storage, GKE, Cloud SQL, Cloud Functions, Pub/Sub
  - Azure (6): Virtual Machine, AKS, Blob Storage, SQL Database, Azure Functions, App Gateway
  - Kubernetes (8): Pod, Deployment, Service, Ingress, ConfigMap, Secret, PersistentVolume, Namespace, HPA
  - DevOps (8): Docker, Terraform, Ansible, Jenkins, GitHub Actions, GitLab CI, ArgoCD, Helm
  - Database (5): PostgreSQL, MySQL, Redis, MongoDB, Elasticsearch
  - Monitoring (4): Prometheus, Grafana, Loki, Alertmanager
  - Network (4): Nginx, Traefik, Istio, Vault
  - General (7): Server, Database, User, Cloud, Internet, Firewall, Message Queue
- **검색 기능:** 이름, ID, 카테고리, 태그 기반 실시간 필터링
- **카테고리 필터:** 사이드바에서 클릭으로 카테고리별 필터링 (아이콘 수 표시)
- **3단계 아이콘 크기 토글:** S / M / L (48px, 72px, 96px)
- **아이콘 선택 시 상세 패널:** 미리보기, 이름, 카테고리, 태그 표시
- **다운로드 옵션:**
  - SVG 다운로드 (256px)
  - PNG 다운로드 (256px, canvas 변환)
  - SVG 코드 클립보드 복사 (복사 확인 피드백)
- 태그 클릭으로 즉시 검색어 적용
- 반응형 레이아웃 (모바일: 세로 스택, 카테고리 가로 스크롤)
- glassmorphism 다크 테마 모달 (보라색 악센트)

## 커밋 21: 삿포로 이벤트 캘린더 통합

### 변경 파일
- `api/index.js` (수정 — Doorkeeper/connpass/관광 이벤트 API 프록시 엔드포인트 추가)
- `src/components/Calendar.jsx` (수정 — 삿포로 이벤트 통합, 날짜 선택, 이벤트 상세)
- `src/components/Calendar.css` (수정 — 이벤트 도트, 상세 패널, 리프레시 버튼 스타일)

### 주요 내용
- **삿포로 IT 커뮤니티 & 관광 이벤트를 기존 캘린더에 통합**
- **3가지 이벤트 소스:**
  - **Doorkeeper** (파란색 #4285F4): 삿포로 IT/테크 이벤트 (API 프록시, Bearer 토큰 인증)
  - **connpass** (빨간색 #E94F37): API 키 등록 후 활성화 (환경변수 `CONNPASS_API_KEY`)
  - **관광·생활** (노란색 #FBBF24): 삿포로 연간 정기 이벤트 10개 (정적 JSON)
- **API 프록시 엔드포인트 (api/index.js):**
  - `GET /api/sapporo-events/doorkeeper` — Doorkeeper API 프록시 (캐시 30분)
  - `GET /api/sapporo-events/connpass` — connpass API 프록시 (키 미설정 시 503)
  - `GET /api/sapporo-events/tourism` — 관광 이벤트 (연도별 날짜 해석)
  - `GET /api/sapporo-events/all` — 통합 엔드포인트 (월별 조회, 정렬, 소스별 카운트)
  - 인메모리 캐시 (TTL 30분), `refresh=true` 파라미터로 강제 갱신
- **관광 이벤트 (10개):**
  - さっぽろ雪まつり (눈축제), ライラックまつり (라일락축제), YOSAKOIソーラン祭り
  - さっぽろ夏まつり (여름축제), 大通ビアガーデン (비어가든), 北海道マラソン
  - オータムフェスト (가을축제), ホワイトイルミネーション, ミュンヘン・クリスマス市
  - 初詣 北海道神宮 (새해 첫 참배)
- **캘린더 UI 확장:**
  - 날짜 셀에 소스별 색상 도트 표시 (Doorkeeper 파랑, connpass 빨강, 관광 노랑)
  - 날짜 클릭 시 이벤트 상세 패널 표시
  - 상세 패널 탭 필터: 전체 / IT / 관광
  - 이벤트 카드: 소스 배지, 시간, 제목, 장소, 참가자 수, 그룹명
  - 관광 이벤트는 일본어 제목 + 한국어 부제 + 설명 표시
  - 이벤트 카드 클릭 시 원본 페이지 새 탭 오픈
- **자동/수동 갱신:**
  - 월 변경 시 자동 fetch
  - 30분 간격 자동 리프레시 (setInterval)
  - ↻ 리프레시 버튼 (로딩 스피너 애니메이션)
  - 마지막 갱신 시간 tooltip 표시
- **소스 범례 (legend):** 3색 도트 + 라벨 표시
- **다가오는 삿포로 이벤트:** 2주 이내 이벤트 최대 5건 표시 (기존 "다가오는 휴일" 위)
- 기존 KR/JP 공휴일 기능 완전 유지

---

## 22. feat: 삿포로 문화·전시·라이프스타일 이벤트 추가
**파일:**
- `api/index.js` (SAPPORO_CULTURE_EVENTS 추가, /culture 엔드포인트, /all 확장)
- `src/components/Calendar.jsx` (culture 소스 색상, 문화 탭, 필터링 확장)
- `src/components/Calendar.css` (탭 크기 조정)

**기능:**
- **4번째 이벤트 소스 추가: `culture` (에메랄드 그린 #10B981)**
  - 기존 3소스(Doorkeeper/connpass/관광)에 문화·전시 소스 추가
- **15개 삿포로 문화·전시·라이프스타일 이벤트:**
  - 🎵 음악/공연: PMF(パシフィック・ミュージック・フェスティバル), サッポロ・シティ・ジャズ, RISING SUN ROCK FESTIVAL, 札幌国際短編映画祭
  - 🎨 예술/전시: 札幌芸術の森 野外美術館, 北海道立近代美術館 特別展, さっぽろアートステージ, モエレ沼公園ガラスのピラミッド企画展
  - 🏮 계절문화: 北海道神宮例祭(札幌まつり), 定山渓 渓流鯉のぼり, 定山渓ネイチャールミナリエ, モエレ沼芸術花火
  - 🛍️ 라이프스타일: 大通公園とうきびワゴン, サッポロファクトリー クリスマス, 北海道フードフェスティバル
- **이벤트 카테고리 분류:** music, exhibition, seasonal, lifestyle (`?category=` 파라미터)
- **API 엔드포인트:**
  - `GET /api/sapporo-events/culture` — 문화 이벤트 (카테고리 필터 지원)
  - `GET /api/sapporo-events/all` — culture 소스 통합 (sources.culture 카운트 포함)
- **캘린더 탭 확장:** 전체 / IT / 관광 / 문화 (4탭)
- **소스 범례 확장:** 4색 도트 (파랑·빨강·노랑·초록)
- 각 문화 이벤트에 일본어 제목 + 한국어 부제 + 공식 URL 포함
- 공식 사이트 링크: pmf.or.jp, sapporocityjazz.jp, rfrfes.com, artpark.or.jp, moerenumapark.jp, jozankei.jp 등

---

## 23. feat: 삿포로 이벤트 웹 스크래핑 + 24시간 자동 갱신 시스템
**파일:**
- `api/index.js` (스크래핑 시스템 전체 구현, 기존 정적 데이터 → 스크래핑+폴백 하이브리드로 전환)

**기능:**
- **웹 스크래핑 인프라:**
  - `fetchHTML(url, timeoutMs)` — native `fetch()` + AbortSignal.timeout + redirect follow
  - `extractJapaneseDateRanges(text)` — 3가지 일본어 날짜 패턴 자동 추출:
    - Pattern 1: `YYYY年MM月DD日～(MM月)?DD日` (표준 일본어)
    - Pattern 2: `YYYYMM.DD[DAY]~YYYYMM.DD[DAY]` (sapporo.travel 컴팩트 형식)
    - Pattern 3: `YYYY/M/D～M/D` (슬래시 형식)
  - `filterSeasonalDates(dates, minMonth, maxMonth)` — 월 범위 필터 + 연도별 중복 제거
  - `fmtDate(year, month, day)` — 날짜 문자열 헬퍼
- **활성 스크래퍼 (SSR 사이트, 정상 작동):**
  - `scrapeSnowFestival()` — snowfes.com에서 눈축제 날짜 추출 (2024~2027 데이터 확인)
  - `scrapeYosakoi()` — yosakoi-soran.jp에서 YOSAKOI 날짜 추출
  - `scrapeHokkaidoMarathon()` — hokkaido-marathon.com
  - `scrapePMF()` — pmf.or.jp에서 PMF 날짜 추출 (2026: 7/7~7/27 확인)
  - `scrapeCityJazz()` — sapporocityjazz.jp
  - `scrapeRisingSun()` — rfrfes.com
  - `scrapeShortFilmFest()` — sapporoshortfest.jp
- **비활성 스크래퍼 (SPA 사이트 — JS 렌더링으로 fetch 불가, 검증된 폴백 사용):**
  - sapporo.travel/lilacfes (라일락축제) → 폴백: 5/20~5/31
  - sapporo.travel/autumnfest (오텀페스트) → 폴백: 9/11~10/3
  - sapporo.travel/white-illumination (일루미네이션) → 폴백: 11/21~12/25
- **하이브리드 데이터 전략:**
  - `scrapedEventsStore` — 인메모리 스크래핑 결과 저장소
  - `TOURISM_FALLBACK` — 10개 관광 이벤트 (공식 사이트에서 검증된 2026년 날짜)
  - `CULTURE_FALLBACK` — 15개 문화 이벤트 (검증된 날짜)
  - `mergeScrapedWithFallback(scrapedList, fallbackList, year)` — 스크래핑 성공 시 해당 이벤트 날짜 오버라이드, 실패 시 폴백 유지
- **주기적 자동 갱신:**
  - 서버 시작 5초 후 첫 스크래핑 실행
  - 24시간 간격 `setInterval`로 자동 재스크래핑
  - `scrapeAllEvents()` — Promise.allSettled로 모든 스크래퍼 병렬 실행
- **API 엔드포인트:**
  - `GET /api/sapporo-events/scraper-status` — 스크래퍼 상태 조회 (마지막 실행, 에러, 다음 스크래핑 시간)
  - `GET /api/sapporo-events/scrape` — 강제 재스크래핑 트리거
  - `GET /api/sapporo-events/tourism` — 응답에 `source: 'scraped+fallback'`, `scrapedCount` 포함
  - `GET /api/sapporo-events/culture` — 동일 하이브리드 응답 형식
- **검증된 2026년 실제 날짜:**
  - 눈축제: 2/4~2/11 (snowfes.com 스크래핑), 라일락: 5/20~5/31 (공식 확인)
  - YOSAKOI: 6/10~6/14, 마라톤: 8/30, 오텀페스트: 9/11~10/3 (공식 확인)
  - PMF: 7/7~7/27 (pmf.or.jp 스크래핑), 일루미네이션: 11/21~12/25

---

## 24. style: 앱 아이콘 그리드 오른쪽 중앙 재배치
**파일:** `src/App.css`
- 앱 아이콘 그리드를 `bottom: 1.5rem` (우하단) → `top: 50%; transform: translateY(-50%)` (우측 중앙)으로 재배치
- 그리드 컨테이너에 미세한 배경(`rgba(255,255,255,0.02)`) + 테두리 + `border-radius: 18px` 적용
- 아이콘 크기 50px → 46px, gap 10px → 8px로 컴팩트화
- `max-height: calc(100vh - 3rem)` + 스크롤바 숨김으로 소형 뷰포트 대응
- 드롭다운(Glow/Effect 피커) 위치를 `right: calc(100% + 8px)`로 좌측 팝업 방식으로 변경
