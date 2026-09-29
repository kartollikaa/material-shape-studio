package io.github.kartollikaa.shapestudio.engine

import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class FixturesTest {
    private val root = File(System.getProperty("fixtures.dir") ?: error("fixtures.dir is not set"))
    private val update = System.getProperty("fixtures.update") == "true"

    @Test
    fun everyFixtureMatchesTheJvmEngineExactly() {
        val documents = File(root, "documents").listFiles { f -> f.extension == "json" }.orEmpty().sortedBy { it.name }
        assertTrue(documents.isNotEmpty(), "no fixture documents in $root")
        val mismatches = documents.mapNotNull { document ->
            val actual = ShapeEngine.build(document.readText()).toJson() + "\n"
            val expected = File(root, "expected/${document.name}")
            when {
                update -> {
                    expected.parentFile.mkdirs()
                    expected.writeText(actual)
                    null
                }
                !expected.exists() -> "${document.name}: no expected file; run ./gradlew :engine:jvmTest -PupdateFixtures"
                expected.readText() != actual -> "${document.name}: the JVM engine no longer matches the committed fixture"
                else -> null
            }
        }
        assertEquals(emptyList(), mismatches)
    }
}
