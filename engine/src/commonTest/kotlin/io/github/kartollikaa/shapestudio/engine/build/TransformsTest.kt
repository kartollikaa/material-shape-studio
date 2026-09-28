package io.github.kartollikaa.shapestudio.engine.build

import io.github.kartollikaa.shapestudio.engine.ShapeEngine
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class TransformsTest {
    private val square = """{"kind":"polygon","vertices":[[1,0],[2,0],[2,1],[1,1]],"rounding":{"radius":0.2}}"""
    private val star = """{"kind":"star","verticesPerRadius":5,"innerRadius":0.5,"rounding":{"radius":0.1},"center":[0.5,0.5]}"""

    @Test
    fun rotateQuarterTurnMapsXOntoY() =
        assertMapped(square, """[{"type":"rotate","degrees":90}]""") { x, y -> -y to x }

    @Test
    fun rotateNegativeTurnsClockwiseInMathCoordinates() {
        val c = cos(PI / 4).toFloat()
        assertMapped(square, """[{"type":"rotate","degrees":-45}]""") { x, y -> (c * x + c * y) to (-c * x + c * y) }
    }

    @Test
    fun scaleMultipliesEachAxis() = assertMapped(square, """[{"type":"scale","x":2,"y":3}]""") { x, y -> 2 * x to 3 * y }

    @Test
    fun translateAddsToEachAxis() = assertMapped(square, """[{"type":"translate","x":1,"y":-1}]""") { x, y -> x + 1 to y - 1 }

    @Test
    fun transformsApplyInDocumentOrder() {
        val scaleThenRotate = build(square, """[{"type":"scale","x":2,"y":1},{"type":"rotate","degrees":90}]""")
        val rotateThenScale = build(square, """[{"type":"rotate","degrees":90},{"type":"scale","x":2,"y":1}]""")
        assertMapped(square, """[{"type":"scale","x":2,"y":1},{"type":"rotate","degrees":90}]""") { x, y -> -y to 2 * x }
        assertMapped(square, """[{"type":"rotate","degrees":90},{"type":"scale","x":2,"y":1}]""") { x, y -> -2 * y to x }
        assertTrue(scaleThenRotate.cubics.indices.any { abs(scaleThenRotate.cubics[it] - rotateThenScale.cubics[it]) > 1e-3f })
    }

    @Test
    fun fillSquareStretchesTheExactBoundsToTheUnitSquare() {
        val polygon = ShapeEngine.parse(
            """{"v":1,"shape":$star,"transforms":[{"type":"scale","x":3,"y":0.5},{"type":"fillSquare"}]}""",
        ).toRoundedPolygon()
        val bounds = polygon.calculateBounds(approximate = false)
        floatArrayOf(0f, 0f, 1f, 1f).forEachIndexed { i, e -> assertEquals(e, bounds[i], absoluteTolerance = 1e-5f, "bounds[$i]") }
    }

    @Test
    fun startAnglePutsTheFirstPointAtThatAngleFromTheCentre() {
        listOf(90, -135, 180).forEach { angle ->
            val polygon = ShapeEngine.parse(
                """{"v":1,"shape":$star,"transforms":[{"type":"startAngle","degrees":$angle}]}""",
            ).toRoundedPolygon()
            val first = polygon.cubics.first()
            val actual = atan2(first.anchor0Y - polygon.centerY, first.anchor0X - polygon.centerX) * 180f / PI.toFloat()
            val difference = ((actual - angle) % 360f + 540f) % 360f - 180f
            assertTrue(abs(difference) < 1e-3f, "startAngle $angle put the first point at $actual degrees")
        }
    }

    @Test
    fun startAngleZeroLeavesTheShapeUnchanged() {
        assertContentEquals(build(star, "[]").cubics, build(star, """[{"type":"startAngle","degrees":0}]""").cubics)
    }

    private fun build(shape: String, transforms: String) =
        ShapeEngine.build("""{"v":1,"shape":$shape,"transforms":$transforms}""")

    private fun assertMapped(shape: String, transforms: String, map: (Float, Float) -> Pair<Float, Float>) {
        val original = build(shape, "[]").cubics
        val transformed = build(shape, transforms).cubics
        assertEquals(original.size, transformed.size)
        for (i in original.indices step 2) {
            val (x, y) = map(original[i], original[i + 1])
            assertEquals(x, transformed[i], absoluteTolerance = 1e-5f, "x at $i")
            assertEquals(y, transformed[i + 1], absoluteTolerance = 1e-5f, "y at ${i + 1}")
        }
    }
}
