package io.github.kartollikaa.shapestudio.engine.build

import androidx.graphics.shapes.CornerRounding
import androidx.graphics.shapes.RoundedPolygon
import io.github.kartollikaa.shapestudio.engine.ShapeEngine
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals

class ShapeBuilderTest {
    @Test
    fun ngonDocumentBuildsTheLibrarysPolygon() {
        val built = ShapeEngine.build(
            """{"v":1,"shape":{"kind":"ngon","vertices":6,"radius":2,"center":[1,2],"rounding":{"radius":0.2,"smoothing":0.5}}}""",
        )
        val expected = RoundedPolygon(
            numVertices = 6,
            radius = 2f,
            centerX = 1f,
            centerY = 2f,
            rounding = CornerRounding(0.2f, 0.5f),
        )
        assertContentEquals(expected.flatCubics(), built.cubics)
    }

    @Test
    fun ngonPerVertexRoundingIsPassedInOrder() {
        val built = ShapeEngine.build(
            """{"v":1,"shape":{"kind":"ngon","vertices":4,"perVertexRounding":[{"radius":1},{"radius":1},{"radius":0.2},{"radius":0.2}]}}""",
        )
        val expected = RoundedPolygon(
            numVertices = 4,
            perVertexRounding = listOf(CornerRounding(1f), CornerRounding(1f), CornerRounding(0.2f), CornerRounding(0.2f)),
        )
        assertContentEquals(expected.flatCubics(), built.cubics)
    }

    @Test
    fun ngonDefaultsAreTheLibrarysDefaults() {
        val built = ShapeEngine.build("""{"v":1,"shape":{"kind":"ngon","vertices":5}}""")
        assertContentEquals(RoundedPolygon(numVertices = 5).flatCubics(), built.cubics)
    }

    @Test
    fun polygonDocumentBuildsTheLibrarysPolygon() {
        val built = ShapeEngine.build(
            """{"v":1,"shape":{"kind":"polygon","vertices":[[1.004,1.0],[0.0,1.0],[0.0,-0.003],[0.978,0.02]],"perVertexRounding":[{"radius":0.148,"smoothing":0.417},{"radius":0.151},{"radius":0.148},{"radius":0.803}],"center":[0.5,0.5]}}""",
        )
        val expected = RoundedPolygon(
            vertices = floatArrayOf(1.004f, 1f, 0f, 1f, 0f, -0.003f, 0.978f, 0.02f),
            perVertexRounding = listOf(
                CornerRounding(0.148f, 0.417f),
                CornerRounding(0.151f),
                CornerRounding(0.148f),
                CornerRounding(0.803f),
            ),
            centerX = 0.5f,
            centerY = 0.5f,
        )
        assertContentEquals(expected.flatCubics(), built.cubics)
    }

    @Test
    fun polygonDefaultsAreTheLibrarysDefaults() {
        val built = ShapeEngine.build("""{"v":1,"shape":{"kind":"polygon","vertices":[[0,0],[1,0],[0.5,1]]}}""")
        assertContentEquals(RoundedPolygon(vertices = floatArrayOf(0f, 0f, 1f, 0f, 0.5f, 1f)).flatCubics(), built.cubics)
    }

    @Test
    fun flatCubicsUsesTheDocumentedOrder() {
        val polygon = RoundedPolygon(numVertices = 3, rounding = CornerRounding(0.3f))
        val first = polygon.cubics.first()
        val expected = floatArrayOf(
            first.anchor0X, first.anchor0Y,
            first.control0X, first.control0Y,
            first.control1X, first.control1Y,
            first.anchor1X, first.anchor1Y,
        )
        assertContentEquals(expected, polygon.flatCubics().copyOfRange(0, 8))
        assertEquals(polygon.cubics.size * 8, polygon.flatCubics().size)
    }

    @Test
    fun normalizeFitsAWideShapeToTheUnitSquare() {
        val built = ShapeEngine.build(
            """{"v":1,"shape":{"kind":"polygon","vertices":[[0,0],[4,0],[4,1],[0,1]]},"transforms":[{"type":"normalize"}]}""",
        )
        assertBounds(floatArrayOf(0f, 0.375f, 1f, 0.625f), built.bounds)
    }

    @Test
    fun normalizeFitsATallShapeToTheUnitSquare() {
        val built = ShapeEngine.build(
            """{"v":1,"shape":{"kind":"polygon","vertices":[[0,0],[1,0],[1,4],[0,4]]},"transforms":[{"type":"normalize"}]}""",
        )
        assertBounds(floatArrayOf(0.375f, 0f, 0.625f, 1f), built.bounds)
    }

    private fun assertBounds(expected: FloatArray, actual: FloatArray) {
        expected.forEachIndexed { i, e -> assertEquals(e, actual[i], absoluteTolerance = 1e-5f, "bounds[$i]") }
    }
}
