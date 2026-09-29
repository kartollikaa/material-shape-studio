package io.github.kartollikaa.shapestudio.engine

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class FixturesTest {
    private val root = File(System.getProperty("fixtures.dir") ?: error("fixtures.dir is not set"))
    private val update = System.getProperty("fixtures.update") == "true"
    private val morphProgress = listOf("0" to 0f, "0.5" to 0.5f, "1" to 1f)

    @Test
    fun everyFixtureMatchesTheJvmEngineExactly() = checkFixtures("documents", "expected") { text ->
        ShapeEngine.build(text).toJson()
    }

    @Test
    fun everyMorphFixtureMatchesTheJvmEngineExactly() = checkFixtures("morphs", "expected-morphs") { text ->
        val fixture = Json.parseToJsonElement(text).jsonObject
        val morph = ShapeEngine.morph(fixture.getValue("start").toString(), fixture.getValue("end").toString())
        buildJsonObject {
            morphProgress.forEach { (key, progress) -> put(key, JsonArray(morph.cubics(progress).map { JsonPrimitive(it) })) }
        }.toString()
    }

    private fun checkFixtures(inputs: String, outputs: String, produce: (String) -> String) {
        val files = File(root, inputs).listFiles { f -> f.extension == "json" }.orEmpty().sortedBy { it.name }
        assertTrue(files.isNotEmpty(), "no fixtures in $root/$inputs")
        val mismatches = files.mapNotNull { input ->
            val actual = produce(input.readText()) + "\n"
            val expected = File(root, "$outputs/${input.name}")
            when {
                update -> {
                    expected.parentFile.mkdirs()
                    expected.writeText(actual)
                    null
                }
                !expected.exists() -> "${input.name}: no expected file; run ./gradlew :engine:jvmTest -PupdateFixtures"
                expected.readText() != actual -> "${input.name}: the JVM engine no longer matches the committed fixture"
                else -> null
            }
        }
        assertEquals(emptyList(), mismatches)
    }
}
