import Fluent
import Vapor

func routes(_ app: Application) throws {
  app.get { req async throws in
    try await req.view.render("index", ["title": "Hello Vapor!"])
  }

  app.get("hello") { req async -> String in
    "Hello, world!"
  }

  app.get("hello", ":name") { req async throws -> String in
    let name = try req.parameters.require("name")

    let number = Int.random(in: 1...100)
    let quotation = """
      Even though there's whitespace to the left,
      the actual lines aren't indented.
          Except for this line.
      Double quotes (") can appear without being escaped.

      I still have \(number) pieces of fruit.
      """
    req.logger.info("The quotation is: \(quotation)")

    let numbers = [1, 2, 3, 4, 5]
    let trippleNumbers = numbers.map { $0 * 3 }
    req.logger.info("The numbers are: \(numbers), and the tripple numbers are: \(trippleNumbers)")

    return "Hello, \(name.capitalized)!"
  }

  try app.register(collection: TodoController())
}
