# [1.7.0](https://github.com/seonNoh/seonology-clock-page/compare/v1.6.0...v1.7.0) (2026-03-01)


### Features

* add Google search bar & random bookmark colors ([2e36951](https://github.com/seonNoh/seonology-clock-page/commit/2e369515a5dcf13612a95b626646a3ae4913319b))

# [1.6.0](https://github.com/seonNoh/seonology-clock-page/compare/v1.5.0...v1.6.0) (2026-03-01)


### Features

* add bookmarks feature with PVC persistence (v1.5.0) ([a52315a](https://github.com/seonNoh/seonology-clock-page/commit/a52315a66b1c159f99967c81b78b6e7a926e3aa5))

# [1.5.0](https://github.com/seonNoh/seonology-clock-page/compare/v1.4.1...v1.5.0) (2026-03-01)


### Features

* add cursor canvas animations, enhance SEONOLOGY title & fix theme toggle hover\n\n- 12가지 캔버스 기반 커서 애니메이션 효과 추가 (trail, comet, particles, ripple, fireflies, bubbles, stardust, snow, magnetic, constellation, wave, spotlight)\n- CursorCanvas.jsx 컴포넌트 신규 생성 (memo + requestAnimationFrame 기반)\n- 기존 글로우 색상 13종과 독립적으로 조합 가능한 2버튼 피커 UI 구현\n- SEONOLOGY 버튼을 브랜드 타이틀 스타일로 개선 (hover 시 accent dot, 언더라인 애니메이션, Services 라벨 슬라이드업)\n- 시계 테마 토글 버튼 hover 영역 수정 (padding 확장으로 모든 테마에서 접근 가능)\n- Word Clock/LED 테마의 개별 패딩 해킹 제거, 공통 .clock 패딩 체계로 통합\n- FlipClock 버그 수정, 폰트 Inter/Noto Sans KR/JP 적용, LED 6색상+5형태 등 이전 작업 포함" ([a579c87](https://github.com/seonNoh/seonology-clock-page/commit/a579c872d031ce232a3d886d4ab44844b1df9f7c))

## [1.4.1](https://github.com/seonNoh/seonology-clock-page/compare/v1.4.0...v1.4.1) (2026-02-28)


### Bug Fixes

* add git pull step after semantic release to fetch VERSION file ([78c8251](https://github.com/seonNoh/seonology-clock-page/commit/78c8251af21cbc34764921a8cdb6e1a40f3ec5f0))

# [1.4.0](https://github.com/seonNoh/seonology-clock-page/compare/v1.3.2...v1.4.0) (2026-02-28)


### Features

* add clock theme switcher with digital, analog, and flip styles ([3e3973b](https://github.com/seonNoh/seonology-clock-page/commit/3e3973b628936ec436bee2d99bf61d8cff6b4037))

## [1.3.2](https://github.com/seonNoh/seonology-clock-page/compare/v1.3.1...v1.3.2) (2026-02-28)


### Bug Fixes

* correct nginx configuration file structure ([c842e22](https://github.com/seonNoh/seonology-clock-page/commit/c842e222883c596d2079e20ccbb23a2b2ab737f0))

## [1.3.1](https://github.com/seonNoh/seonology-clock-page/compare/v1.3.0...v1.3.1) (2026-02-28)


### Bug Fixes

* remove server block wrapper from nginx.conf ([ea55c79](https://github.com/seonNoh/seonology-clock-page/commit/ea55c7954e3a4fa4677c9fd262312ad1cf215a1a))

# [1.3.0](https://github.com/seonNoh/seonology-clock-page/compare/v1.2.0...v1.3.0) (2026-02-28)


### Bug Fixes

* adjust bottom elements position to avoid footer overlap ([286c6a8](https://github.com/seonNoh/seonology-clock-page/commit/286c6a8b04dba83a9a7e3dcd96af30ddb669ad1a))


### Features

* add icons for all services ([c91e815](https://github.com/seonNoh/seonology-clock-page/commit/c91e81573183a7738cc4934f7bc7ffd41b9e4c11))
* add k8s API integration and nginx proxy for production ([3e84d24](https://github.com/seonNoh/seonology-clock-page/commit/3e84d24fbf6b183bcc88b68da40e975168122382))
* add SEONOLOGY button with dynamic service loading from k8s ([14e3cf8](https://github.com/seonNoh/seonology-clock-page/commit/14e3cf8ec22f5d31bcd423505d7725642c73d628))
* replace text-based icons with service-specific SVG icons ([0a781d6](https://github.com/seonNoh/seonology-clock-page/commit/0a781d6fdee1d9d1e324137513296029f100e289))
* separate SEONOLOGY button into dedicated top-left area ([10f2455](https://github.com/seonNoh/seonology-clock-page/commit/10f2455cdebda029e43ceccfa1e2f486af931d94))

# [1.2.0](https://github.com/seonNoh/seonology-clock-page/compare/v1.1.0...v1.2.0) (2026-02-28)


### Bug Fixes

* resolve infinite refresh issue in WeatherWidget ([ab7919e](https://github.com/seonNoh/seonology-clock-page/commit/ab7919eeea8310b002796a085b57dd3b30af7c39))


### Features

* add footer with author info and version ([2bd629c](https://github.com/seonNoh/seonology-clock-page/commit/2bd629c690c36fd04507c6e9e9354c1446c9a525))
* change exchange rate API to real-time Manana API ([9809d3d](https://github.com/seonNoh/seonology-clock-page/commit/9809d3d25a889d10f973b3f91fd085ca841fdee5))


### Performance Improvements

* change weather API refresh interval to 15 minutes ([3d6dfec](https://github.com/seonNoh/seonology-clock-page/commit/3d6dfece495b54990276c673877f2efd54249b19))

# [1.1.0](https://github.com/seonNoh/seonology-clock-page/compare/v1.0.4...v1.1.0) (2026-01-31)


### Features

* add auto-refresh for weather and exchange rate widgets ([3cfdd95](https://github.com/seonNoh/seonology-clock-page/commit/3cfdd95dbfcd2d3d0e2974a5f4c4ab3b0b1bea38))

## [1.0.4](https://github.com/seonNoh/seonology-clock-page/compare/v1.0.3...v1.0.4) (2026-01-25)


### Bug Fixes

* use cert-manager for TLS certificate instead of Traefik certResolver ([a1368d1](https://github.com/seonNoh/seonology-clock-page/commit/a1368d1c1575e8510da8cd77b1f3f6a85bd1d807))

## [1.0.3](https://github.com/seonNoh/seonology-clock-page/compare/v1.0.2...v1.0.3) (2026-01-25)


### Bug Fixes

* convert repository owner to lowercase for docker tag ([1a31b16](https://github.com/seonNoh/seonology-clock-page/commit/1a31b16ec5e69cd61ac651841427198d00ff370b))

## [1.0.2](https://github.com/seonNoh/seonology-clock-page/compare/v1.0.1...v1.0.2) (2026-01-25)


### Bug Fixes

* use lowercase repository owner for docker image tag ([cc2a0f7](https://github.com/seonNoh/seonology-clock-page/commit/cc2a0f79e3f5cd9d361cbc227e914e37a94ac2ed))

## [1.0.1](https://github.com/seonNoh/seonology-clock-page/compare/v1.0.0...v1.0.1) (2026-01-25)


### Bug Fixes

* disable github plugin comments to avoid permission issues ([fd9e34d](https://github.com/seonNoh/seonology-clock-page/commit/fd9e34dc64f0334e463df3b09978055b478ca4be))

# 1.0.0 (2026-01-25)


### Features

* initial clock page setup with k8s deployment ([f268ae3](https://github.com/seonNoh/seonology-clock-page/commit/f268ae3904821b90107e5ee8c28312cac70fc08a))
