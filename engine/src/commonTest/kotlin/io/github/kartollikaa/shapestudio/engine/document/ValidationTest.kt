package io.github.kartollikaa.shapestudio.engine.document

import io.github.kartollikaa.shapestudio.engine.ShapeEngine
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class ValidationTest {
    @Test
    fun unsupportedVersionNamesV() = assertRejected("v", """{"v":2,"shape":{"kind":"ngon","vertices":4}}""")

    @Test
    fun unknownKindNamesShapeKind() = assertRejected("shape.kind", """{"v":1,"shape":{"kind":"hexagon","vertices":6}}""")

    @Test
    fun malformedJsonNamesTheDocument() = assertRejected("document", """{"v":1,""")

    @Test
    fun polygonWithTwoVerticesAndNoRepeatNamesVertices() =
        assertRejected("shape.vertices", """{"v":1,"shape":{"kind":"polygon","vertices":[[0,0],[1,1]]}}""")

    @Test
    fun ngonWithTwoVerticesNamesVertices() =
        assertRejected("shape.vertices", """{"v":1,"shape":{"kind":"ngon","vertices":2}}""")

    @Test
    fun perVertexRoundingOfTheWrongLengthNamesIt() = assertRejected(
        "shape.perVertexRounding",
        """{"v":1,"shape":{"kind":"polygon","vertices":[[0,0],[1,0],[1,1],[0,1]],"perVertexRounding":[{"radius":0.1},{"radius":0.1},{"radius":0.1}]}}""",
    )

    @Test
    fun smoothingAboveOneNamesTheEntry() = assertRejected(
        "shape.perVertexRounding[1].smoothing",
        """{"v":1,"shape":{"kind":"polygon","vertices":[[0,0],[1,0],[0.5,1]],"perVertexRounding":[{"radius":0.1},{"radius":0.1,"smoothing":1.5},{"radius":0.1}]}}""",
    )

    @Test
    fun negativeRoundingRadiusNamesIt() = assertRejected(
        "shape.rounding.radius",
        """{"v":1,"shape":{"kind":"ngon","vertices":5,"rounding":{"radius":-0.1}}}""",
    )

    @Test
    fun repeatCountBelowOneNamesIt() = assertRejected(
        "shape.repeat.count",
        """{"v":1,"shape":{"kind":"polygon","vertices":[[0,0],[1,0],[0.5,1]],"repeat":{"count":0,"mirror":false}}}""",
    )

    @Test
    fun misspelledFieldNamesTheShape() = assertRejected("shape", """{"v":1,"shape":{"kind":"ngon","vertex":4}}""")

    @Test
    fun unknownTransformNamesItsType() = assertRejected(
        "transforms[0].type",
        """{"v":1,"shape":{"kind":"ngon","vertices":4},"transforms":[{"type":"twist"}]}""",
    )

    @Test
    fun twoVertexSliceWithRepeatIsValid() {
        ShapeEngine.parse(
            """{"v":1,"shape":{"kind":"polygon","vertices":[[0.926,0.97],[-0.021,0.967]],"repeat":{"count":2,"mirror":false}}}""",
        )
    }

    @Test
    fun startAngleNotLastNamesIt() = assertRejected(
        "transforms[0]",
        """{"v":1,"shape":{"kind":"ngon","vertices":5},"transforms":[{"type":"startAngle","degrees":90},{"type":"normalize"}]}""",
    )

    @Test
    fun fractionalStartAngleNamesTheDegrees() = assertRejected(
        "transforms[0].degrees",
        """{"v":1,"shape":{"kind":"ngon","vertices":5},"transforms":[{"type":"startAngle","degrees":90.5}]}""",
    )

    @Test
    fun starInnerRadiusNotBelowRadiusNamesIt() = assertRejected(
        "shape.innerRadius",
        """{"v":1,"shape":{"kind":"star","verticesPerRadius":5,"radius":1,"innerRadius":1}}""",
    )

    @Test
    fun starWithOneVertexPerRadiusNamesIt() = assertRejected(
        "shape.verticesPerRadius",
        """{"v":1,"shape":{"kind":"star","verticesPerRadius":1}}""",
    )

    @Test
    fun nonPositivePillWidthNamesIt() = assertRejected("shape.width", """{"v":1,"shape":{"kind":"pill","width":0}}""")

    @Test
    fun innerRadiusRatioOutsideTheRangeNamesIt() {
        assertRejected("shape.innerRadiusRatio", """{"v":1,"shape":{"kind":"pillStar","innerRadiusRatio":1.2}}""")
        assertRejected("shape.innerRadiusRatio", """{"v":1,"shape":{"kind":"pillStar","innerRadiusRatio":0}}""")
    }

    @Test
    fun rectanglePerVertexRoundingNeedsFourEntries() = assertRejected(
        "shape.perVertexRounding",
        """{"v":1,"shape":{"kind":"rectangle","perVertexRounding":[{"radius":0.1},{"radius":0.1},{"radius":0.1}]}}""",
    )

    @Test
    fun starPerVertexRoundingNeedsTwoEntriesPerPoint() = assertRejected(
        "shape.perVertexRounding",
        """{"v":1,"shape":{"kind":"star","verticesPerRadius":3,"perVertexRounding":[{"radius":0.1},{"radius":0.1},{"radius":0.1}]}}""",
    )

    @Test
    fun pillStarPerVertexRoundingNeedsTwoEntriesPerPoint() = assertRejected(
        "shape.perVertexRounding",
        """{"v":1,"shape":{"kind":"pillStar","verticesPerRadius":4,"perVertexRounding":[{"radius":0.1},{"radius":0.1},{"radius":0.1}]}}""",
    )

    @Test
    fun unparsableFeaturesNameTheString() =
        assertRejected("shape.serialized", """{"v":1,"shape":{"kind":"features","serialized":"V1zzz"}}""")

    @Test
    fun circleWithTwoVerticesNamesThem() =
        assertRejected("shape.vertices", """{"v":1,"shape":{"kind":"circle","vertices":2}}""")

    @Test
    fun zeroScaleNamesTheFactor() = assertRejected(
        "transforms[0].x",
        """{"v":1,"shape":{"kind":"ngon","vertices":5},"transforms":[{"type":"scale","x":0,"y":1}]}""",
    )

    @Test
    fun fillSquareOnAFlatShapeNamesTheTransform() = assertBuildRejected(
        "transforms[0]",
        """{"v":1,"shape":{"kind":"polygon","vertices":[[0,0],[1,0],[2,0]]},"transforms":[{"type":"fillSquare"}]}""",
    )

    private fun assertBuildRejected(field: String, json: String) {
        val error = assertFailsWith<DocumentException> { ShapeEngine.build(json) }
        assertEquals(field, error.field)
        assertTrue(error.message.orEmpty().startsWith("$field: "), "message was: ${error.message}")
    }

    private fun assertRejected(field: String, json: String) {
        val error = assertFailsWith<DocumentException> { ShapeEngine.parse(json) }
        assertEquals(field, error.field)
        assertTrue(error.message.orEmpty().startsWith("$field: "), "message was: ${error.message}")
    }
}
