package io.github.kartollikaa.shapestudio.engine.export

import androidx.graphics.shapes.RoundedPolygon
import io.github.kartollikaa.shapestudio.engine.ShapeEngine
import io.github.kartollikaa.shapestudio.engine.build.flatCubics
import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ExportCase(val name: String, val document: String, val exported: RoundedPolygon)

class ExportRoundTripTest {
    @Test
    fun everyExportedShapeMatchesTheEngine() {
        assertTrue(exportCases.size >= 60, "expected the catalogue, the fixtures and the edited cases, got ${exportCases.size}")
        val mismatches = exportCases.mapNotNull { case ->
            val expected = ShapeEngine.build(case.document).cubics
            val actual = case.exported.flatCubics()
            when {
                expected.size != actual.size -> "${case.name}: ${actual.size / 8} cubics exported, ${expected.size / 8} built"
                else -> expected.indices.maxOf { abs(expected[it] - actual[it]) }.takeIf { it > TOLERANCE }?.let { "${case.name}: off by $it" }
            }
        }
        assertEquals(emptyList(), mismatches)
    }

    private companion object {
        const val TOLERANCE = 1e-4f
    }
}
