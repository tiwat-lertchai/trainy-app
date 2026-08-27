export const messages = {
	th: {
		"nav.features": "ความสามารถ", "nav.workflow": "ขั้นตอนการใช้งาน", "nav.security": "ความปลอดภัย",
		"auth.signIn": "เข้าสู่ระบบด้วย LINE", "hero.eyebrow": "ระบบบริหารการฝึกงานสำหรับทุกฝ่าย",
		"hero.title": "เปลี่ยนทุกขั้นตอนการฝึกงานให้ชัดเจนและติดตามได้",
		"hero.description": "Trainy เชื่อมโยงนักศึกษา มหาวิทยาลัย และสถานประกอบการไว้ในพื้นที่เดียว ตั้งแต่ค้นหาที่ฝึกงานจนถึงการประเมินผล",
		"hero.primary": "เริ่มใช้งาน Trainy", "hero.secondary": "ดูขั้นตอนการทำงาน", "hero.note": "เข้าสู่ระบบอย่างปลอดภัยด้วยบัญชี LINE",
		"preview.heading": "สวัสดีตอนเช้า, นรินทร์", "preview.subheading": "คุณมี 3 รายการที่ต้องดำเนินการ",
		"preview.active": "กำลังฝึกงาน", "preview.hours": "ชั่วโมงสะสม", "preview.progress": "ความคืบหน้า", "preview.next": "สิ่งที่ต้องทำต่อ",
		"preview.task1": "ส่งรายงานความก้าวหน้าสัปดาห์ที่ 4", "preview.task2": "อัปโหลดเอกสารยินยอม", "preview.today": "วันนี้", "preview.friday": "วันศุกร์",
		"trust.workflow": "ทุกขั้นตอนอยู่ในที่เดียว", "trust.workflowDetail": "สมัคร จัดสรร ติดตาม และประเมินผลด้วยข้อมูลชุดเดียวกัน",
		"trust.roles": "ออกแบบตามบทบาท", "trust.rolesDetail": "แต่ละคนเห็นเฉพาะงานและข้อมูลที่เกี่ยวข้องกับตนเอง",
		"trust.secure": "ปลอดภัยระดับองค์กร", "trust.secureDetail": "ยืนยันตัวตน แยกข้อมูลองค์กร และบันทึกการเปลี่ยนแปลง",
	},
	en: {
		"nav.features": "Features", "nav.workflow": "Workflow", "nav.security": "Security",
		"auth.signIn": "Continue with LINE", "hero.eyebrow": "Internship management for every participant",
		"hero.title": "Make every internship step clear and trackable",
		"hero.description": "Trainy connects students, universities, and companies in one workspace—from discovery and applications to progress tracking and evaluation.",
		"hero.primary": "Get started with Trainy", "hero.secondary": "See how it works", "hero.note": "Secure sign-in with your LINE account",
		"preview.heading": "Good morning, Narin", "preview.subheading": "You have 3 items requiring action",
		"preview.active": "Active placement", "preview.hours": "Hours logged", "preview.progress": "Progress", "preview.next": "Next actions",
		"preview.task1": "Submit week 4 progress report", "preview.task2": "Upload consent document", "preview.today": "Today", "preview.friday": "Friday",
		"trust.workflow": "One connected workflow", "trust.workflowDetail": "Apply, place, track, and evaluate using one reliable record.",
		"trust.roles": "Designed around roles", "trust.rolesDetail": "Each person sees only the work and information relevant to them.",
		"trust.secure": "Organization-grade security", "trust.secureDetail": "Authenticated access, tenant isolation, and auditable changes.",
	},
} as const;

export type Locale = keyof typeof messages;
export type MessageKey = keyof (typeof messages)["en"];
