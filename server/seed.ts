import { storage } from "./storage";
import bcrypt from "bcrypt";

async function seedDatabase() {
  console.log("🌱 데이터베이스 시드 작업을 시작합니다...");

  try {
    // Create admin user if not exists
    const existingAdmin = await storage.getUserByRole("admin");
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("admin123!", 10);
      await storage.createUser({
        username: "admin",
        email: "admin@jungwonflight.edu",
        password: hashedPassword,
        role: "admin",
        isApproved: true
      });
      console.log("✅ 관리자 계정 생성 완료 (username: admin, password: admin123!)");
    }

    // Create sample student user
    const existingStudent = await storage.getUserByUsername("student1");
    if (!existingStudent) {
      const hashedPassword = await bcrypt.hash("student123!", 10);
      await storage.createUser({
        username: "student1",
        email: "student1@jungwonflight.edu",
        password: hashedPassword,
        role: "student",
        isApproved: true
      });
      console.log("✅ 테스트 학생 계정 생성 완료 (username: student1, password: student123!)");
    }

    // Create categories
    const categories = [
      {
        name: "기초 비행 이론",
        description: "비행의 기본 원리와 항공역학의 기초를 배웁니다",
        icon: "plane"
      },
      {
        name: "항공기 시스템",
        description: "항공기의 각종 시스템과 구조에 대해 학습합니다",
        icon: "settings"
      },
      {
        name: "기상학",
        description: "항공 기상과 날씨 현상에 대한 이해를 높입니다",
        icon: "cloud"
      },
      {
        name: "항법",
        description: "항공 항법의 원리와 실무를 배웁니다",
        icon: "map"
      },
      {
        name: "비상 절차",
        description: "비상 상황 시 대처 방법과 절차를 학습합니다",
        icon: "alert-triangle"
      }
    ];

    const createdCategories = [];
    for (const categoryData of categories) {
      const existingCategory = await storage.getCategoryByName(categoryData.name);
      if (!existingCategory) {
        const category = await storage.createCategory(categoryData);
        createdCategories.push(category);
        console.log(`✅ 카테고리 생성: ${categoryData.name}`);
      } else {
        createdCategories.push(existingCategory);
      }
    }

    // 샘플 영상은 생성하지 않음 - 관리자가 직접 업로드해야 함
    const sampleVideos: any[] = [
      // 사용자가 직접 업로드한 영상만 유지
      // 더 이상 자동으로 샘플 영상을 생성하지 않음
    ];

    const admin = await storage.getUserByRole("admin");
    for (const videoData of sampleVideos) {
      const existingVideo = await storage.getVideoByTitle(videoData.title);
      if (!existingVideo) {
        await storage.createVideo({
          ...videoData,
          uploadedBy: admin!.id
        });
        console.log(`✅ 동영상 생성: ${videoData.title}`);
      }
    }

    console.log("🎉 데이터베이스 시드 작업이 완료되었습니다!");
    console.log("\n📋 계정 정보:");
    console.log("관리자 계정 - username: admin, password: admin123!");
    console.log("학생 계정 - username: student1, password: student123!");
    console.log("\n📝 참고: 관리자 계정으로 로그인하여 /admin 페이지에서 영상을 업로드하세요.");

  } catch (error) {
    console.error("❌ 시드 작업 중 오류 발생:", error);
  }
}

// 항상 시드 함수 실행
seedDatabase();

export { seedDatabase }; 