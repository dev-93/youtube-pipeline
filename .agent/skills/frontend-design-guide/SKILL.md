---
name: frontend-design-guide
description: 디자이너 없이 프론트엔드 개발 시 UI 컴포넌트 설계, 레이아웃 구성, 색상 및 타이포그래피 선택, 일관성 유지에 대한 가이드라인과 모범 사례를 제공합니다.
---

# Frontend Design Guide

## Overview

이 스킬은 디자이너 없이 프론트엔드 개발을 진행할 때, 효과적인 UI/UX를 구현하기 위한 가이드라인과 모범 사례를 제공합니다. UI 컴포넌트 설계, 레이아웃 구성, 색상 및 타이포그래피 선택, 그리고 전반적인 디자인 일관성 유지에 대한 지침을 포함합니다.

## Guidelines

### 1. UI 컴포넌트 설계 (UI Component Design)

- **재사용성**: 컴포넌트를 작고 재사용 가능하도록 설계합니다. Storybook과 같은 도구를 활용하여 컴포넌트 라이브러리를 구축하고 관리하는 것을 고려합니다.
- **접근성**: 모든 컴포넌트가 웹 접근성 표준(WCAG)을 준수하도록 합니다. 의미론적 HTML 태그를 사용하고, ARIA 속성을 적절히 활용합니다.
- **상태 관리**: 컴포넌트의 다양한 상태(기본, 호버, 활성, 비활성, 오류 등)를 명확하게 정의하고 시각적으로 표현합니다.
- **예시**:
    - 버튼: `primary`, `secondary`, `danger`, `success` 등의 명확한 목적을 가진 버튼 스타일을 정의합니다.
    - 입력 필드: `text`, `email`, `password`, `number` 등 타입별로 일관된 디자인을 유지합니다.

### 2. 레이아웃 구성 (Layout Composition)

- **그리드 시스템**: 일관된 간격과 정렬을 위해 그리드 시스템(예: CSS Grid, Flexbox 기반)을 활용합니다. Bootstrap이나 Tailwind CSS와 같은 프레임워크를 사용하는 경우, 해당 프레임워크의 그리드 시스템을 따릅니다.
- **반응형 디자인**: 다양한 화면 크기에 대응할 수 있도록 모바일 우선(Mobile-First) 접근 방식 또는 반응형 디자인 원칙을 적용합니다.
- **시각적 계층**: 정보의 중요도에 따라 시각적 계층을 명확히 설정하여 사용자가 중요한 콘텐츠에 집중할 수 있도록 안내합니다.
- **여백**: 일관된 여백(padding, margin) 규칙을 적용하여 요소 간의 관계를 명확히 하고 가독성을 높입니다.

### 3. 색상 및 타이포그래피 선택 (Color and Typography Selection)

- **색상 팔레트**: 메인 색상, 보조 색상, 중립 색상, 강조 색상을 포함하는 제한적인 색상 팔레트를 정의하고 일관되게 사용합니다. Color Hunt, Coolors와 같은 도구를 활용하여 팔레트를 생성할 수 있습니다.
- **대비**: 텍스트와 배경색 간의 충분한 대비를 확보하여 가독성을 높입니다(WCAG 기준 준수).
- **타이포그래피**: 폰트 패밀리(글꼴), 크기, 줄 간격(line-height), 글자 간격(letter-spacing)에 대한 명확한 규칙을 정의합니다. 웹 폰트(Google Fonts 등)를 활용하여 시각적 매력을 높일 수 있습니다.
- **계층적 글꼴**: 제목, 부제목, 본문, 작은 텍스트 등 역할에 따라 글꼴 스타일을 계층적으로 사용하여 정보의 중요도를 시각적으로 구분합니다.

### 4. 일관성 유지 (Maintaining Consistency)

- **디자인 시스템**: 가능한 경우, Ant Design, Material-UI, Chakra UI와 같은 기존 디자인 시스템을 활용하거나, 자체적인 경량 디자인 시스템을 구축하여 컴포넌트, 스타일, 가이드라인을 중앙 집중화합니다.
- **스타일 가이드 문서**: 색상, 타이포그래피, 아이콘, 컴포넌트 사용법 등에 대한 간단한 스타일 가이드를 문서화하여 팀원들과 공유합니다.
- **명명 규칙**: CSS 클래스, 컴포넌트 이름 등에 대한 일관된 명명 규칙(예: BEM, styled-components 규칙)을 사용하여 코드의 가독성과 유지보수성을 높입니다.
- **피드백 및 검토**: 주기적으로 동료들과 디자인 리뷰를 진행하여 일관성을 유지하고 개선점을 찾습니다.

## Resources

이 스킬에는 다양한 유형의 번들 리소스를 구성하는 방법을 보여주는 예제 리소스 디렉토리가 포함되어 있습니다.

### scripts/
Executable code that can be run directly to perform specific operations.

**Examples from other skills:**
- PDF skill: fill_fillable_fields.cjs, extract_form_field_info.cjs - utilities for PDF manipulation
- CSV skill: normalize_schema.cjs, merge_datasets.cjs - utilities for tabular data manipulation

**Appropriate for:** Node.cjs scripts (cjs), shell scripts, or any executable code that performs automation, data processing, or specific operations.

**Note:** Scripts may be executed without loading into context, but can still be read by Gemini CLI for patching or environment adjustments.

### references/
Documentation and reference material intended to be loaded into context to inform Gemini CLI's process and thinking.

**Examples from other skills:**
- Product management: communication.md, context_building.md - detailed workflow guides
- BigQuery: API reference documentation and query examples
- Finance: Schema documentation, company policies

**Appropriate for:** In-depth documentation, API references, database schemas, comprehensive guides, or any detailed information that Gemini CLI should reference while working.

### assets/
Files not intended to be loaded into context, but rather used within the output Gemini CLI produces.

**Examples from other skills:**
- Brand styling: PowerPoint template files (.pptx), logo files
- Frontend builder: HTML/React boilerplate project directories
- Typography: Font files (.ttf, .woff2)

**Appropriate for:** Templates, boilerplate code, document templates, images, icons, fonts, or any files meant to be copied or used in the final output.

---

**Any unneeded directories can be deleted.** Not every skill requires all three types of resources.
