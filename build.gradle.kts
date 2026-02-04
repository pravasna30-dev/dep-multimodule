plugins {
    base
}

allprojects {
    repositories {
        mavenLocal()
        mavenCentral()
    }
}

subprojects {
    tasks.withType<JavaCompile> {
        options.encoding = "UTF-8"
    }
}
