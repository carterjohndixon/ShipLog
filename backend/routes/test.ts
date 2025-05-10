import express from "express";
import supabase from "../db/db";

const router = express.Router();

router.get("/db", async (req, res) => {
    // const { data, error } = await supabase.from("test_table").insert([
    //     { id: 1, username: "John.Doe" },
    // ]);

    // if (error) {
    //     console.error("Insert error:", error);
    //     res.status(500).send("Failed to insert");
    //     return;
    // }

    // console.log("Inserted:", data);
    // res.send("Successfully inserted data into db!");
    res.send("Entered the db!");
});

export default router;
