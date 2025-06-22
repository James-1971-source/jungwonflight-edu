import { storage } from "./storage";
import bcrypt from "bcrypt";

async function seed() {
  console.log("🌱 데이터베이스 시드 작업을 시작합니다...");

  // 관리자 계정 생성
  try {
    const adminUser = await storage.getUserByUsername("admin");
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash("admin123!", 10);
      await storage.createUser({
        username: "admin",
        email: "admin@jungwonflight.edu",
        password: hashedPassword,
        role: "admin",
        isApproved: true,
      });
      console.log("✅ 관리자 계정 생성 완료 (username: admin, password: admin123!)");
    }
  } catch (error) {
    console.error("❗️ 관리자 계정 생성 중 오류 발생:", error);
  }

  // 학생 계정 생성
  try {
    const studentUser = await storage.getUserByUsername("student1");
    if (!studentUser) {
        const hashedPassword = await bcrypt.hash("student123!", 10);
        await storage.createUser({
            username: "student1",
            email: "student1@example.com",
            password: hashedPassword,
            role: "student",
            isApproved: true
        });
        console.log("✅ 학생 계정 생성 완료 (username: student1, password: student123!)");
    }
  } catch(error) {
      console.error("❗️ 학생 계정 생성 중 오류 발생:", error);
  }

  // --- 데이터 초기화 시작 ---
  // 연결된 데이터부터 순서대로 삭제해야 외래 키 제약 조건 오류가 발생하지 않습니다.
  console.log("🧹 데이터베이스 초기화를 시작합니다...");
  try {
    await storage.deleteAllUserCourses();
    console.log("  - 수강 중인 강의 정보 삭제 완료");
    await storage.deleteAllUserProgress();
    console.log("  - 학습 진도 정보 삭제 완료");
    await storage.deleteAllUserNotes();
    console.log("  - 강의 노트 정보 삭제 완료");
    await storage.deleteAllVideos();
    console.log("  - 동영상 정보 삭제 완료");
    await storage.deleteAllCategories();
    console.log("  - 카테고리 정보 삭제 완료");
    console.log("✅ 데이터베이스 초기화 완료.");
  } catch (error) {
    console.error("❗️ 데이터 초기화 중 심각한 오류 발생:", error);
    // 초기화 실패 시 더 이상 진행하지 않음
    process.exit(1);
  }
  // --- 데이터 초기화 종료 ---

  // 새로운 카테고리 목록
  const newCategories = [
    { name: "ATPL(Airlines Transport Pilot)", description: "운송용 조종사 과정", icon: "Globe" },
    { name: "CPL(Commnercial Pilot)", description: "사업용 조종사 과정", icon: "Award" },
    { name: "IFR(Instrument Flight Rule) Rating", description: "계기 비행 증명 과정", icon: "Radar" },
    { name: "LSA(Light Sport Aircraft) Pilot", description: "경량항공기 조종사 과정", icon: "Plane" },
    { name: "LSA(Light Sport Aircraft) Instructor Pilot", description: "경량항공기 교관 과정", icon: "BookUser" },
    { name: "Multi-Engine Rating", description: "다발 한정 증명 과정", icon: "Aperture" },
    { name: "Mountain Flying", description: "산악 비행 과정", icon: "Mountain" },
    { name: "NFQP(Night Flying Qualified Pilot)", description: "야간 비행 자격 과정", icon: "Moon" },
    { name: "PPL(Private Pilot License)", description: "자가용 조종사 면장 과정", icon: "BadgeCheck" },
  ];

  // 카테고리 생성
  for (const categoryData of newCategories) {
    try {
      const existing = await storage.getCategoryByName(categoryData.name);
      if (!existing) {
        await storage.createCategory(categoryData);
        console.log(`✅ 카테고리 생성: ${categoryData.name}`);
      }
    } catch (error) {
      console.error(`❗️ "${categoryData.name}" 카테고리 생성 중 오류 발생:`, error);
    }
  }

  console.log("🎉 데이터베이스 시드 작업이 완료되었습니다!");
  console.log("\n📋 계정 정보:");
  console.log("관리자 계정 - username: admin, password: admin123!");
  console.log("학생 계정 - username: student1, password: student123!");
  console.log("\n📝 참고: 관리자 계정으로 로그인하여 /admin 페이지에서 영상을 업로드하세요.");
}

seed().catch((e) => {
  console.error("❌ 시드 작업 실패:", e);
  process.exit(1);
});

export { seed }; 