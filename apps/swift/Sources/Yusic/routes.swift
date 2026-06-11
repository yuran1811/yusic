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
    req.logger.info("The number is: \(number)")

    return "Hello, \(name.capitalized)!"
  }

  try app.register(collection: TodoController())
}
