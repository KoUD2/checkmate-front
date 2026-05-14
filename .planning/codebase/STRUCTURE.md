# CheckMate — Project File Structure
<!-- last_mapped: 2026-05-14 -->

```
CheckMate/
├── docker-compose.yml          # Orchestrates postgres + backend + frontend
├── nginx.conf                  # Host-level reverse proxy config
├── scripts/                    # Utility scripts (deploy, migrations, etc.)
│
├── backend/                    # NestJS API
│   ├── Dockerfile
│   ├── nest-cli.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma       # Single source of truth for DB schema
│   │   └── migrations/         # Prisma migration history
│   └── src/
│       ├── main.ts             # Bootstrap: CORS, Swagger, pipes, proxy setup
│       ├── app.module.ts       # Root module — imports all feature modules
│       │
│       ├── prisma/
│       │   ├── prisma.module.ts
│       │   └── prisma.service.ts
│       │
│       ├── auth/
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── auth.module.ts
│       │   ├── dto/
│       │   │   ├── signup.dto.ts
│       │   │   ├── login.dto.ts
│       │   │   └── telegram-auth.dto.ts
│       │   ├── guards/
│       │   │   ├── jwt-auth.guard.ts
│       │   │   └── local-auth.guard.ts
│       │   └── strategies/
│       │       ├── jwt.strategy.ts
│       │       └── local.strategy.ts
│       │
│       ├── users/
│       │   ├── users.controller.ts
│       │   ├── users.service.ts
│       │   └── users.module.ts
│       │
│       ├── tasks/
│       │   ├── tasks.controller.ts
│       │   ├── tasks.service.ts
│       │   ├── tasks.module.ts
│       │   └── dto/
│       │       ├── create-task37.dto.ts … create-task42.dto.ts
│       │       └── task-feedback.dto.ts
│       │
│       ├── gemini/
│       │   ├── gemini.service.ts    # All AI calls (GPT + Whisper + TTS)
│       │   ├── gemini.module.ts
│       │   └── prompts/
│       │       ├── security_preamble.txt
│       │       ├── prompt1.txt – prompt3.txt      # Task 37 K1-K3
│       │       ├── prompt38_1.txt – prompt38_5.txt # Task 38 K1-K5
│       │       ├── prompt39_1.txt, prompt39_2.txt  # Task 39
│       │       ├── prompt40_1.txt                  # Task 40
│       │       ├── prompt41_1.txt                  # Task 41
│       │       └── prompt42_1.txt – prompt42_3.txt # Task 42 K1-K3
│       │
│       ├── subscriptions/
│       │   ├── subscriptions.controller.ts
│       │   ├── subscriptions.service.ts
│       │   ├── subscriptions.module.ts
│       │   └── dto/activate-promo.dto.ts
│       │
│       ├── payments/
│       │   ├── payments.controller.ts
│       │   ├── payments.service.ts
│       │   ├── payments.module.ts
│       │   └── dto/create-payment.dto.ts
│       │
│       ├── admin/
│       │   ├── admin.controller.ts
│       │   ├── admin.service.ts
│       │   ├── admin.module.ts
│       │   └── dto/
│       │       ├── create-promo.dto.ts
│       │       └── update-user.dto.ts
│       │
│       ├── referrals/
│       │   ├── referrals.controller.ts
│       │   ├── referrals.service.ts
│       │   └── referrals.module.ts
│       │
│       ├── resources/
│       │   ├── resources.controller.ts
│       │   ├── resources.service.ts
│       │   ├── resources.module.ts
│       │   └── dto/
│       │       ├── create-resource.dto.ts
│       │       └── update-resource.dto.ts
│       │
│       ├── email/
│       │   ├── email.service.ts
│       │   └── email.module.ts
│       │
│       └── common/
│           ├── decorators/
│           │   ├── current-user.decorator.ts
│           │   └── roles.decorator.ts
│           ├── filters/
│           │   └── http-exception.filter.ts
│           └── guards/
│               └── roles.guard.ts
│
└── frontend/                   # Next.js 16 App Router
    ├── Dockerfile
    ├── next.config.ts
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── middleware.ts       # Edge middleware: auth redirects
        │
        ├── app/                # Next.js App Router pages
        │   ├── layout.tsx      # Root layout: providers, analytics scripts
        │   ├── page.tsx        # Home / dashboard (/)
        │   ├── sitemap.ts
        │   │
        │   ├── (auth)/
        │   │   ├── login/page.tsx
        │   │   └── register/page.tsx
        │   │
        │   ├── create-work/page.tsx
        │   ├── tasks/[id]/page.tsx
        │   ├── subscribe/page.tsx
        │   ├── payments/page.tsx
        │   ├── payment/success/page.tsx
        │   ├── referral/page.tsx
        │   │
        │   ├── resources/
        │   │   ├── page.tsx
        │   │   ├── ResourcesListClient.tsx
        │   │   └── [slug]/page.tsx
        │   │
        │   ├── admin/
        │   │   ├── layout.tsx
        │   │   ├── page.tsx
        │   │   ├── users/page.tsx
        │   │   ├── payments/page.tsx
        │   │   ├── promos/page.tsx
        │   │   ├── tasks/page.tsx
        │   │   └── resources/
        │   │       ├── page.tsx
        │   │       ├── new/page.tsx
        │   │       ├── [id]/page.tsx
        │   │       └── ResourceForm.tsx
        │   │
        │   └── api/
        │       ├── api-auth/               # BFF auth proxy (sets cookies)
        │       │   ├── login/route.ts
        │       │   ├── logout/route.ts
        │       │   ├── refresh/route.ts
        │       │   └── signup/route.ts
        │       ├── payments/verify/route.ts
        │       └── proxy/[...path]/route.ts
        │
        ├── components/
        │   ├── PostHogProvider.tsx
        │   ├── auth/
        │   │   ├── AuthGuard.tsx
        │   │   └── RequireAuth.tsx
        │   ├── layout/
        │   │   ├── AppLayout/AppLayout.tsx
        │   │   └── MainLayout/MainLayout.tsx
        │   ├── resources/
        │   │   ├── ArticleView.tsx
        │   │   ├── ChecklistView.tsx
        │   │   ├── TemplateView.tsx
        │   │   ├── TrainerView.tsx
        │   │   ├── ResourceCard.tsx
        │   │   └── ResourceFilter.tsx
        │   ├── screens/
        │   │   ├── AdminDashboard/
        │   │   ├── CreateWorkPage/         # Task submission wizard
        │   │   │   ├── CreateWorkPage.tsx
        │   │   │   └── ui/task37/ … ui/task42/
        │   │   ├── Main/
        │   │   ├── PaymentsPage/
        │   │   ├── ReferralPage/
        │   │   └── SubscribePage/
        │   └── ui/                         # Reusable UI primitives
        │       ├── ActiveButton/
        │       ├── TaskCard/
        │       ├── Criteria/
        │       └── … (other primitives)
        │
        ├── config/context/
        │   ├── AuthContext.tsx
        │   └── TaskCheckContext.tsx
        │
        ├── services/
        │   ├── auth.service.ts
        │   ├── payment.service.ts
        │   ├── referral.service.ts
        │   ├── resources.service.ts
        │   └── token.service.ts
        │
        ├── hooks/useAuth.ts
        ├── lib/auth.ts
        ├── api/
        │   ├── axios.ts
        │   ├── essayService.ts
        │   └── types.ts
        ├── shared/
        │   ├── images/
        │   └── utils/
        │       ├── api.ts
        │       └── cookies.ts
        └── fonts/              # Self-hosted Gilroy woff/woff2
```

---
*Mapped: 2026-05-14*
