# API Gateway Admin Frontend

Frontend ReactJS cho dashboard quan tri API Gateway `GW_v1`.

## Yeu cau

- Node.js 18 tro len
- npm
- Backend Gateway dang chay, mac dinh tai:

```text
http://localhost:8080
```

## Cai dat lan dau

Sau khi clone repo ve, mo terminal tai thu muc frontend:

```bash
cd frontend_api_gateway
npm install
```

## Cau hinh Gateway URL

Mac dinh frontend se goi backend tai:

```text
http://localhost:8080
```

Neu muon doi URL backend, tao file `.env` trong thu muc frontend:

```bash
copy .env.example .env
```

Neu chua co `.env.example`, co the tao file `.env` va them:

```env
VITE_GATEWAY_BASE_URL=http://localhost:8080
```

Trong giao dien cung co o `Gateway URL`, co the sua truc tiep va bam nut save.

## Chay giao dien dev

```bash
npm run dev
```

Mo trinh duyet:

```text
http://localhost:5173
```

## Build production

```bash
npm run build
```

File build nam trong thu muc:

```text
dist/
```

## Chay ban build de test

```bash
npm run preview
```

Mo trinh duyet:

```text
http://localhost:4173
```

## Cac API backend dang duoc binding

Frontend hien dang goi cac endpoint cua Gateway:

```text
GET    /health
GET    /ready

GET    /admin/services
POST   /admin/services
GET    /admin/services/:id
PUT    /admin/services/:id
DELETE /admin/services/:id

GET    /admin/instances
GET    /admin/instances/:id
PUT    /admin/instances/:id
DELETE /admin/instances/:id

POST   /admin/services/:id/instances
GET    /admin/services/:id/instances

GET    /admin/routes
POST   /admin/routes
GET    /admin/routes/:id
PUT    /admin/routes/:id
DELETE /admin/routes/:id
```

## Luu y

- Phai chay backend Gateway truoc, neu khong dashboard se bao loi ket noi.
- Backend mac dinh chay cong `8080`, frontend mac dinh chay cong `5173`.
- Cac module monitoring nhu request count, latency, error rate, traffic chart va recent logs hien moi la giao dien/demo. Muon load so lieu that can them backend API cho metrics/logs.
- Khong commit `node_modules`, `.env`, `dist` len git.

## Lenh nhanh

```bash
npm install
npm run dev
```

Sau do mo:

```text
http://localhost:5173
```
