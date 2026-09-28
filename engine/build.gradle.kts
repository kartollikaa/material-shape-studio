import groovy.json.JsonSlurper

plugins {
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.kotlin.serialization)
}

val enginePackageDir = rootProject.layout.projectDirectory.dir("packages/engine")

val generateEngineVersion = tasks.register("generateEngineVersion") {
    val packageJson = enginePackageDir.file("package.json")
    val graphicsShapesVersion = libs.versions.graphics.shapes.get()
    val outputDir = layout.buildDirectory.dir("generated/engineVersion")
    inputs.file(packageJson)
    inputs.property("graphicsShapesVersion", graphicsShapesVersion)
    outputs.dir(outputDir)
    doLast {
        val engineVersion = (JsonSlurper().parse(packageJson.asFile) as Map<*, *>)["version"]
        val file = outputDir.get().file("EngineVersion.kt").asFile
        file.parentFile.mkdirs()
        file.writeText(
            """
            |package io.github.kartollikaa.shapestudio.engine
            |
            |internal const val ENGINE_VERSION = "$engineVersion"
            |internal const val GRAPHICS_SHAPES_VERSION = "$graphicsShapesVersion"
            |""".trimMargin(),
        )
    }
}

kotlin {
    jvmToolchain(17)
    jvm()
    js {
        outputModuleName = "engine"
        nodejs()
        binaries.library()
        useEsModules()
        generateTypeScriptDefinitions()
    }
    sourceSets {
        commonMain {
            kotlin.srcDir(generateEngineVersion)
            dependencies {
                implementation(libs.graphics.shapes)
                implementation(libs.androidx.collection)
                implementation(libs.kotlinx.serialization.json)
            }
        }
        commonTest.dependencies { implementation(kotlin("test")) }
    }
}

val jsPackage = tasks.register<Sync>("jsPackage") {
    from(tasks.named("jsNodeProductionLibraryDistribution"))
    include("engine.mjs", "engine.mjs.map", "engine.d.mts")
    into(enginePackageDir.dir("dist"))
}

tasks.named("assemble") { dependsOn(jsPackage) }

tasks.named<Test>("jvmTest") {
    val fixtures = layout.projectDirectory.dir("fixtures")
    inputs.dir(fixtures).withPropertyName("fixtures")
    systemProperty("fixtures.dir", fixtures.asFile.absolutePath)
    if (providers.gradleProperty("updateFixtures").isPresent) {
        systemProperty("fixtures.update", "true")
        outputs.upToDateWhen { false }
    }
}
