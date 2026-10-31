# PENORIX 웹사이트

Precision Meets Possibility. 정적 사이트(HTML/CSS/JS) + Supabase(문의 저장, 로고 업로드).
빌드 도구가 없어서 폴더 그대로 Vercel 또는 Netlify에 올리면 됩니다.

## 1단계 범위 (완료)

| 페이지 | 파일 |
| --- | --- |
| Home | `index.html` |
| Collection | `collection.html` |
| Corporate Gifts + 견적 폼 | `corporate-gifts.html` |
| Contact | `contact.html` |
| Our Story (B안: 선교 정체성은 이 페이지에서만) | `story.html` |
| 개인정보 안내 (초안) | `privacy.html` |

영어 기본, 우측 상단 버튼으로 한국어 전환(선택은 브라우저에 저장). 문구는 모두 `js/i18n.js`에 있습니다.
2단계: Product 상세, Engrave Preview, 자체 결제, Heritage.

## 로컬에서 보기

```
python3 -m http.server 8000
```

`http://localhost:8000` 접속. Supabase 설정 전에는 폼에 "Demo mode" 안내가 뜨고, 제출해도 저장되지 않습니다.

## Supabase 연결

1. Supabase 프로젝트 생성 후 SQL Editor에서 `supabase/schema.sql` 실행. 테이블 2개(`quote_requests`, `contact_messages`), RLS(anon은 INSERT만 가능), 비공개 스토리지 버킷 `quote-logos`가 만들어집니다.
2. `js/config.js`에 `supabaseUrl`과 `supabaseAnonKey`(Project Settings > API의 anon public key) 입력. anon 키는 공개되어도 안전하도록 RLS로 제한되어 있습니다.
3. 이메일 알림: `supabase/functions/notify-quote`를 배포하고(`supabase functions deploy notify-quote`), 시크릿(`RESEND_API_KEY`, `MAIL_FROM`, `NOTIFY_TO`, 선택 `NOTIFY_TO_US/KR/IN`, `WEBHOOK_SECRET`)을 설정한 뒤, Dashboard > Database > Webhooks에서 두 테이블의 INSERT에 연결합니다. 헤더 `x-webhook-secret`에 같은 값을 넣어주세요.
4. 접수된 문의와 로고 파일은 Supabase 대시보드(Table Editor, Storage)에서 확인합니다.

## 교체해야 하는 임시값 (TODO)

코드에서 `TODO`로 검색하면 모두 나옵니다.

- `js/config.js`: Supabase 키, 도메인, 아마존/쿠팡 링크(비어 있으면 버튼이 비활성), 문의 이메일, SNS, 법인명
- 가격: Collection의 $25 - $40, $70 - $100은 브리프의 안입니다. 확정 전 표기("Indicative range")가 붙어 있습니다.
- 색상 6종, 소재·마감 문구: 공장(사라 대표) 확인 필요. MOQ, 납기, 각인 한계는 확인 전이라 사이트에 수치를 넣지 않았습니다.
- Our Story의 WMTO 문구: 팀 최종 승인 필요 (선교 노출 B안 기준으로 작성)
- 국가별 담당자 공개 범위, `privacy.html` 최종본, 이용약관
- 이미지: 현재 AI 생성 이미지(임시). 실물 사진 확보 후 `assets/`의 같은 파일명으로 교체. 가로(16:9) 이미지가 생기면 히어로 개선 가능.
- 폰트: Pretendard를 jsDelivr CDN에서 불러옵니다. 자체 호스팅하려면 `css/style.css`의 `font-family`와 `<head>`를 수정하세요.

## 구조

```
index.html ... privacy.html   페이지 (헤더/푸터는 각 파일에 포함)
css/style.css                 디자인 토큰과 전체 스타일 (다크 단일 테마, 직각 모서리)
js/config.js                  설정
js/i18n.js                    EN/KO 문구
js/main.js                    내비, 언어 전환, 스크롤 연출, 히어로 3D 펜(three.js, CDN에서 로드)
js/forms.js                   견적/문의 폼: 검증, 로고 업로드, Supabase REST 전송
assets/                       웹용 이미지·영상 (원본은 .gitignore의 _src/)
supabase/                     schema.sql, 이메일 알림 함수
```

모션은 `prefers-reduced-motion`을 따릅니다. 스팸 대응으로 허니팟과 최소 입력 시간 검사가 들어 있으나, 트래픽이 늘면 Cloudflare Turnstile 같은 캡차를 추가하세요.
