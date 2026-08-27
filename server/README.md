# Trainy Server

Backend API สำหรับระบบจัดการการฝึกงานของ Trainy พัฒนาด้วย Bun, Hono,
Better Auth, Drizzle ORM และ Neon PostgreSQL

เอกสาร Endpoint, สิทธิ์การเข้าถึง, รูปแบบ request/response และสถานะของแต่ละ
workflow อยู่ที่ [เอกสารอ้างอิง API](docs/api-reference.md) ซึ่งสามารถเปิดอ่านแบบ
offline ได้

## การติดตั้ง

รันคำสั่งต่อไปนี้จาก directory หลักของโปรเจกต์เพื่อติดตั้ง dependencies:

```sh
bun install
```

คัดลอกค่าตัวอย่าง environment variables และกรอกข้อมูลที่จำเป็นก่อนเปิด server:

```sh
cp server/.env.example server/.env
```

ห้ามนำ Better Auth secret, LINE secret หรือข้อมูลเชื่อมต่อ Neon database ขึ้น
Git

## การพัฒนา

เปิดเฉพาะ API server จาก directory หลักของโปรเจกต์:

```sh
bun run dev:server
```

Server จะเปิดให้ใช้งานที่ [http://localhost:3000](http://localhost:3000)

เมื่อต้องการเปิดทั้ง client และ server พร้อมกัน ให้ใช้:

```sh
bun run dev
```

## การตรวจสอบก่อน Commit

```sh
bun test server/src
bun run type-check
bun run lint
bun run build
```

ทุกการเปลี่ยนแปลงต้องผ่านการทดสอบที่เกี่ยวข้อง รวมถึง type-check, lint และ build
ก่อน commit หากเพิ่มหรือแก้ไข Endpoint ต้องปรับเอกสาร API และ contract test ให้ตรง
กับ implementation ด้วย
