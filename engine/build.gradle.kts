plugins {
    alias(libs.plugins.kotlin.multiplatform)
}

kotlin {
    jvmToolchain(17)
    jvm()
    js {
        nodejs()
        binaries.library()
        useEsModules()
        generateTypeScriptDefinitions()
    }
    sourceSets {
        commonMain.dependencies { implementation(libs.graphics.shapes) }
        commonTest.dependencies { implementation(kotlin("test")) }
    }
}
