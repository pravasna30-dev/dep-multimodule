plugins {
    application
}

group = "com.example"
version = "1.0.0"

java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
}

repositories {
    mavenLocal()
    mavenCentral()
}

// Configuration for switching between project dependency and published version
val usePublishedLibrary: Boolean = project.hasProperty("usePublishedLibrary")
val libraryVersion: String = project.findProperty("libraryVersion")?.toString() ?: "1.0.0"

dependencies {
    if (usePublishedLibrary) {
        // Use published version from mavenLocal
        implementation("com.example:library:$libraryVersion")
    } else {
        // Use project dependency (always latest)
        implementation(project(":library"))
    }

    // Testing
    testImplementation(platform("org.junit:junit-bom:5.10.2"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testImplementation("org.assertj:assertj-core:3.25.3")
}

tasks.test {
    useJUnitPlatform()
    testLogging {
        events("passed", "skipped", "failed")
        showExceptions = true
        showCauses = true
        showStackTraces = true
    }
}

application {
    mainClass.set("com.example.consumer.Application")
}
