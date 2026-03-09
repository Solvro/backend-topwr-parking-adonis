import router from "@adonisjs/core/services/router";

const ParkingsController = () => import("#controllers/parkings_controller");

router
  .group(() => {
    router.get("/", [ParkingsController, "index"]);
    router.get("/extra-info", [ParkingsController, "extraInfo"]);
    router.get("/:id", [ParkingsController, "show"]);
  })
  .prefix("/api/v1/parkings");
