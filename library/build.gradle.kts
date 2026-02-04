plugins {
    `java-library`
    `maven-publish`
}

group = "com.example"
version = project.findProperty("version")?.toString() ?: "1.0.0"

java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
    withSourcesJar()
}

publishing {
    publications {
        create<MavenPublication>("maven") {
            from(components["java"])

            pom {
                name.set("Example Library")
                description.set("A library demonstrating breaking change detection")
            }
        }
    }
    repositories {
        mavenLocal()
    }
}
