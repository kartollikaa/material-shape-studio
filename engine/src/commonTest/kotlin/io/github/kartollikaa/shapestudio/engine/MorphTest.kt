package io.github.kartollikaa.shapestudio.engine

import io.github.kartollikaa.shapestudio.engine.build.toRoundedPolygon
import io.github.kartollikaa.shapestudio.engine.document.DocumentException
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class MorphTest {
    private val circle = """{"v":1,"shape":{"kind":"circle","vertices":8},"transforms":[{"type":"normalize"}]}"""
    private val star =
        """{"v":1,"shape":{"kind":"star","verticesPerRadius":6,"innerRadius":0.6,"rounding":{"radius":0.1}},"transforms":[{"type":"normalize"}]}"""

    @Test
    fun progressZeroTracesTheStartShape() = assertTraces(circle, ShapeEngine.morph(circle, star).cubics(0f))

    @Test
    fun progressOneTracesTheEndShape() = assertTraces(star, ShapeEngine.morph(circle, star).cubics(1f))

    @Test
    fun progressOutsideZeroToOneNamesProgress() {
        val morph = ShapeEngine.morph(circle, star)
        listOf(-0.1f, 1.1f, Float.NaN).forEach { progress ->
            assertEquals("progress", assertFailsWith<DocumentException> { morph.cubics(progress) }.field)
        }
    }

    private fun assertTraces(document: String, cubics: FloatArray) {
        val expected = ShapeEngine.parse(document).toRoundedPolygon().calculateBounds(approximate = false)
        val actual = sampledExtent(cubics)
        expected.indices.forEach { i -> assertEquals(expected[i], actual[i], absoluteTolerance = 1e-3f, "extent[$i]") }
    }

    private fun sampledExtent(c: FloatArray): FloatArray {
        val extent = floatArrayOf(Float.MAX_VALUE, Float.MAX_VALUE, -Float.MAX_VALUE, -Float.MAX_VALUE)
        for (o in c.indices step 8) {
            for (step in 0..40) {
                val t = step / 40f
                val u = 1 - t
                val x = u * u * u * c[o] + 3 * u * u * t * c[o + 2] + 3 * u * t * t * c[o + 4] + t * t * t * c[o + 6]
                val y = u * u * u * c[o + 1] + 3 * u * u * t * c[o + 3] + 3 * u * t * t * c[o + 5] + t * t * t * c[o + 7]
                extent[0] = minOf(extent[0], x)
                extent[1] = minOf(extent[1], y)
                extent[2] = maxOf(extent[2], x)
                extent[3] = maxOf(extent[3], y)
            }
        }
        return extent
    }
}
